import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Spinner } from "~/components/ui/spinner";
import { useBackendPendingCount } from "~/lib/backend-activity";

/** Quick responses never flash anything. */
const SHOW_AFTER_MS = 300;
/** Past this, say so — a bar alone starts to look like a hung page. */
const SLOW_AFTER_MS = 5000;

/**
 * Whether `busy` has been continuously true for `ms`. Resets the moment it
 * goes false, so each wait is timed on its own.
 */
function useBusyFor(busy: boolean, ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!busy) {
      setElapsed(false);
      return;
    }
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(timer);
  }, [busy, ms]);

  return busy && elapsed;
}

/**
 * Global signal for a slow backend. It watches both the router (navigations and
 * loader refetches) and tracked client requests (mutations and cache-miss
 * reads). Nothing shows for the first 300ms; after that a thin progress bar
 * runs along the top of the window, and if the wait drags on a short note says
 * the server is slow so nobody is left wondering whether to retry.
 *
 * Cache hits never reach the tracker, so a warm read stays invisible.
 */
export function BackendActivityIndicator() {
  const trackedRequests = useBackendPendingCount();
  const routerBusy = useRouterState({
    select: (state) => state.status === "pending" || state.isLoading,
  });

  const busy = trackedRequests > 0 || routerBusy;
  const showBar = useBusyFor(busy, SHOW_AFTER_MS);
  const slow = useBusyFor(busy, SLOW_AFTER_MS);

  if (!showBar) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="civic-progress-track civic-enter-fade pointer-events-none fixed inset-x-0 top-0 z-90 h-0.75 rounded-none bg-transparent"
      />
      {slow && (
        // Centred by the wrapper, not a transform on the pill: the enter
        // animation owns `transform` and would undo a translate.
        <div className="pointer-events-none fixed inset-x-4 bottom-6 z-90 flex justify-center">
          <div
            role="status"
            aria-live="polite"
            className="civic-enter-sm flex items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lg"
          >
            <Spinner className="text-primary" aria-hidden="true" />
            Still working — the server is taking longer than usual.
          </div>
        </div>
      )}
    </>
  );
}
