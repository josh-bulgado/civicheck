import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "~/utils/supabase-browser";

export type RealtimeStatus = "connecting" | "live" | "offline";

/** Collapses a burst of row changes into one refetch. */
const REFRESH_DEBOUNCE_MS = 250;

/**
 * Floor between the *fallback* refetches (tab focus / visibility). Realtime
 * events are never throttled — this only stops alt-tabbing from hammering the
 * loader.
 */
const FALLBACK_MIN_INTERVAL_MS = 5_000;

/**
 * Every channel needs its own topic. Two channels sharing a topic on one socket
 * collide: the second join is rejected and silently receives nothing, while the
 * first keeps its server-side subscription row alive — which looks exactly like
 * "realtime is connected but no events arrive".
 */
let channelSequence = 0;

/**
 * Re-runs the current route's loaders whenever any of the given Postgres tables
 * change, so a page reflects other people's edits without a manual reload.
 *
 * Two things must both be true or the channel connects and stays silent: the
 * table has to be in the `supabase_realtime` publication, and the viewer's own
 * RLS policies have to let them SELECT the row. Realtime evaluates every event
 * against the subscriber's JWT, never the service role.
 */
export function useRealtimeRefresh({
  tables,
  schema = "public",
  enabled = true,
}: {
  tables: string[];
  schema?: string;
  enabled?: boolean;
}): RealtimeStatus {
  const router = useRouter();
  const [status, setStatus] = useState<RealtimeStatus>(
    enabled ? "connecting" : "offline",
  );
  // Keeps the effect from re-subscribing every time the router object changes.
  const routerRef = useRef(router);
  routerRef.current = router;
  // Arrays are a fresh reference each render, so the effect keys off the names.
  const tableKey = tables.join(",");

  useEffect(() => {
    if (!enabled) {
      setStatus("offline");
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | undefined;
    let client: Awaited<ReturnType<typeof getSupabaseBrowserClient>> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    // A dropped socket means missed events, so the first successful (re)join
    // refetches rather than trusting whatever is already on screen.
    let hasSubscribed = false;

    let lastRefreshAt = 0;

    const refreshNow = () => {
      lastRefreshAt = Date.now();
      void routerRef.current.invalidate();
    };

    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(refreshNow, REFRESH_DEBOUNCE_MS);
    };

    // Belt and braces. A backgrounded tab gets its timers throttled, which can
    // cost the socket its heartbeat and leave the channel silently dead; events
    // that land while it is down are simply never replayed. Refetching whenever
    // the page is looked at again means stale data cannot outlive a glance,
    // whatever state the socket is in.
    const refreshFallback = () => {
      if (Date.now() - lastRefreshAt < FALLBACK_MIN_INTERVAL_MS) return;
      refreshNow();
    };

    const handleVisibility = () => {
      if (!document.hidden) refreshFallback();
    };

    void (async () => {
      client = await getSupabaseBrowserClient();
      if (cancelled) return;

      // Realtime authorises the socket with the access token, not the cookie.
      // Setting it before subscribing avoids racing the client's own restore.
      const { data } = await client.auth.getSession();
      if (cancelled) return;
      if (data.session) client.realtime.setAuth(data.session.access_token);

      channelSequence += 1;
      let pending = client.channel(`civicheck-${schema}-${channelSequence}`);
      for (const table of tableKey.split(",")) {
        pending = pending.on(
          "postgres_changes",
          { event: "*", schema, table },
          scheduleRefresh,
        );
      }

      channel = pending.subscribe((channelStatus) => {
        if (cancelled) return;
        if (channelStatus === "SUBSCRIBED") {
          setStatus("live");
          if (hasSubscribed) refreshNow();
          hasSubscribed = true;
          return;
        }
        // CHANNEL_ERROR / TIMED_OUT / CLOSED all mean "not receiving events".
        // supabase-js retries on its own, so this is a display state only.
        setStatus(channelStatus === "CLOSED" ? "offline" : "connecting");
      });
    })();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refreshFallback);

    return () => {
      cancelled = true;
      if (debounce) clearTimeout(debounce);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refreshFallback);
      // removeChannel, not channel.unsubscribe(): unsubscribe leaves the
      // channel registered on the client, so the next mount's channel would
      // collide with this one's topic and go silent.
      if (channel && client) void client.removeChannel(channel);
    };
  }, [enabled, schema, tableKey]);

  return status;
}
