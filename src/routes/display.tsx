import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getNowServingFn } from "~/features/queue/queue.queries";
import { LANE_LABELS, QUEUE_LANES, type NowServingRow } from "~/features/queue/queue.types";

const REFRESH_MS = 15_000;

export const Route = createFileRoute("/display")({
  loader: () => getNowServingFn(),
  staleTime: REFRESH_MS,
  component: DisplayBoard,
});

function DisplayBoard() {
  const initial = Route.useLoaderData();
  const [feed, setFeed] = useState(initial);
  const [now, setNow] = useState(() => new Date());

  // The board reads a SECURITY DEFINER function that exposes only ticket
  // numbers and counters, so it can poll without a session. Realtime isn't
  // usable here — the underlying table is deliberately not anon-readable.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (cancelled || document.hidden) return;
      timer = setTimeout(poll, REFRESH_MS);
    };

    const poll = async () => {
      try {
        const next = await getNowServingFn();
        if (!cancelled) setFeed(next);
      } catch {
        // A dropped poll is harmless; the next tick recovers.
      } finally {
        if (!cancelled) {
          setNow(new Date());
          schedule();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timer) clearTimeout(timer);
        timer = undefined;
        return;
      }

      setNow(new Date());
      void poll();
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const byLane = new Map<string, NowServingRow[]>();
  for (const lane of QUEUE_LANES) byLane.set(lane, []);
  for (const row of feed.nowServing) {
    byLane.get(row.lane)?.push(row);
  }

  return (
    <div className="flex min-h-screen flex-col bg-panel-dark p-8 text-white">
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">
            City Civil Registrar Office · Legazpi City
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Now Serving</h1>
        </div>
        <div className="text-right">
          <p className="text-5xl font-extrabold tabular-nums">
            {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-sm text-white/60">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 py-8 md:grid-cols-2">
        {QUEUE_LANES.map((lane) => {
          const rows = byLane.get(lane) ?? [];
          const waiting = feed.waitingByLane[lane] ?? 0;

          return (
            <section
              key={lane}
              className="flex flex-col gap-4 rounded-2xl bg-panel-dark-row p-7"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-bold">{LANE_LABELS[lane]}</h2>
                <p className="text-sm text-white/60">{waiting} waiting</p>
              </div>

              {rows.length === 0 ? (
                <p className="py-8 text-center text-lg italic text-white/40">
                  No one being served
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {rows.map((row) => (
                    <div
                      key={row.ticketNumber}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-6 py-5"
                    >
                      <span className="text-5xl font-extrabold tabular-nums tracking-tight">
                        {row.ticketNumber}
                      </span>
                      <span className="text-right text-xl font-semibold text-brand-gold">
                        {row.counterName ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <footer className="border-t border-white/10 pt-5 text-center text-sm text-white/50">
        Please listen for your number and proceed to the indicated window.
      </footer>
    </div>
  );
}
