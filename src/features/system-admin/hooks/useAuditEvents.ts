import { useCallback, useEffect, useMemo, useState } from "react";
import {
  auditEventsCacheKey,
  invalidateAuditEventsCache,
  peekAuditEvents,
  readAuditEvents,
} from "../audit-events.cache";
import { getAuditEvents } from "../system-admin.functions";
import type { AuditEventsResult, AuditFilters } from "../system-admin.types";

type ReadState = {
  key: string;
  data: AuditEventsResult | null;
  error: string | null;
};

export function useAuditEvents(userId: string, filters: AuditFilters) {
  const query = useMemo<AuditFilters>(
    () => ({
      q: filters.q || undefined,
      actor: filters.actor || undefined,
      event: filters.event || undefined,
      source: filters.source ?? "all",
      from: filters.from || undefined,
      to: filters.to || undefined,
      account: filters.account || undefined,
    }),
    [
      filters.q,
      filters.actor,
      filters.event,
      filters.source,
      filters.from,
      filters.to,
      filters.account,
    ],
  );
  const key = auditEventsCacheKey(userId, query);
  const [state, setState] = useState<ReadState | null>(null);
  const [reload, setReload] = useState(0);

  const refresh = useCallback(() => {
    invalidateAuditEventsCache();
    setReload((version) => version + 1);
  }, []);

  const revalidate = useCallback(() => {
    if (!peekAuditEvents(userId, query)) setReload((version) => version + 1);
  }, [userId, query]);

  useEffect(() => {
    const cached = peekAuditEvents(userId, query);
    if (cached) {
      setState((previous) =>
        previous?.key === key && previous.data === cached && !previous.error
          ? previous
          : { key, data: cached, error: null },
      );
      return;
    }

    let cancelled = false;
    setState((previous) => ({
      key,
      data: previous?.key === key ? previous.data : null,
      error: null,
    }));
    void readAuditEvents(userId, query, () => getAuditEvents({ data: query }))
      .then((data) => {
        if (!cancelled) setState({ key, data, error: null });
      })
      .catch(() => {
        if (cancelled) return;
        setState((previous) => ({
          key,
          data: previous?.key === key ? previous.data : null,
          error: "We couldn't load the audit events. Please try again.",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, query, key, reload]);

  const current = state?.key === key ? state : null;
  // Serve retained rows immediately while stale data refreshes in the background.
  const data =
    peekAuditEvents(userId, query, { allowStale: true }) ??
    current?.data ??
    null;
  const error = current?.error ?? null;
  return {
    data,
    error,
    isLoading: data === null && error === null,
    refresh,
    revalidate,
  };
}
