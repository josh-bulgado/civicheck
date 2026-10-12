// ─── Backend activity tracker ────────────────────────────────────────────────
// A tiny counter of requests that are currently waiting on the backend, so one
// indicator in the app shell can tell "Supabase is slow" apart from "nothing is
// happening". Anything that goes to the server from the browser outside a route
// loader — mutations, and cache-miss reads — registers its promise here; route
// loaders are already visible through the router's own pending state.
//
// Module-level on purpose: it is only written from browser code paths, and the
// reader (`useBackendPendingCount`) reports 0 on the server.

import { useSyncExternalStore } from "react";

let pending = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Count `work` as in flight until it settles. Returns the same promise, so it
 * can wrap a call in place without changing what the caller awaits or catches.
 */
export function trackBackendRequest<T>(work: Promise<T>): Promise<T> {
  pending += 1;
  emit();

  const done = () => {
    pending = Math.max(0, pending - 1);
    emit();
  };
  work.then(done, done);

  return work;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Number of tracked backend requests currently in flight. */
export function useBackendPendingCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => pending,
    () => 0,
  );
}
