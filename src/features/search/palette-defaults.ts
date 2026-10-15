import { useEffect, useState } from "react";
import {
  getPaletteDefaultsFn,
  type RequestSearchHit,
} from "~/features/search/search.queries";

/**
 * What the applicant's palette lists before anything is typed. Cached in memory
 * so reopening it costs nothing, and warmed when the search pill is hovered or
 * focused so the first open usually has it already. Same approach, and same
 * reasoning, as the bell's notification cache.
 */

const FRESH_MS = 60_000;

let cached: { userId: string; data: RequestSearchHit[]; at: number } | null = null;
let inflight: { userId: string; promise: Promise<RequestSearchHit[]> } | null = null;

/** Resolves from memory while fresh; otherwise one shared request. */
export function loadPaletteDefaults(userId: string): Promise<RequestSearchHit[]> {
  if (cached && cached.userId === userId && Date.now() - cached.at < FRESH_MS) {
    return Promise.resolve(cached.data);
  }
  if (inflight && inflight.userId === userId) return inflight.promise;

  const promise = getPaletteDefaultsFn()
    .then((data) => {
      cached = { userId, data, at: Date.now() };
      return data;
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { userId, promise };
  return promise;
}

/** Something that appears in the list changed (a request moved on). */
export function invalidatePaletteDefaults() {
  if (cached) cached = { ...cached, at: 0 };
}

export type PaletteDefaultsState = "loading" | "ready" | "error";

/**
 * The defaults for the open palette. Whatever is cached is returned at once and
 * quietly refreshed if it has gone stale; `null` data with `loading` is the
 * first-ever load.
 */
export function usePaletteDefaults(userId: string, active: boolean) {
  const [data, setData] = useState<RequestSearchHit[] | null>(() =>
    cached?.userId === userId ? cached.data : null,
  );
  const [state, setState] = useState<PaletteDefaultsState>(
    data ? "ready" : "loading",
  );

  useEffect(() => {
    if (!active || !userId) return;
    let cancelled = false;
    loadPaletteDefaults(userId)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState((current) => (data ? current : "error"));
      });
    return () => {
      cancelled = true;
    };
    // `data` only decides what a failure leaves behind, not whether to load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, userId]);

  return { data, state };
}
