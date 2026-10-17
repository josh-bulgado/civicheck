import { useEffect, useState, type ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * The wizard's waiting states, one set for any wait (README 3u). Nothing here
 * blocks the page: each sits where the wait happens.
 */

/** 18px ring, the top segment solid and the rest at 35%. Stops under reduced motion. */
export function WizardSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4.5 shrink-0 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current/35 border-t-current motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/** A bar with no known end: a segment sliding along a track. */
export function WizardBar({
  className,
  tone = "primary",
}: {
  className?: string;
  tone?: "primary" | "danger";
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("wizard-bar h-1.5", className)}
      style={
        tone === "danger"
          ? ({
              "--wizard-bar-track": "var(--portal-danger-soft)",
              "--wizard-bar-fill": "var(--destructive)",
            } as React.CSSProperties)
          : undefined
      }
    />
  );
}

/** Four bars, 8 to 22px; they ripple while the connection is weak and rest when it is gone. */
function SignalBars({ moving }: { moving: boolean }) {
  const heights = ["h-2", "h-3", "h-4", "h-5.5"];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-5.5 shrink-0 items-end gap-0.75",
        moving && "wizard-signal",
        moving ? "text-primary" : "text-disabled",
      )}
    >
      {heights.map((height) => (
        <span key={height} className={cn("block w-1 rounded-[1px] bg-current", height)} />
      ))}
    </span>
  );
}

export type ConnectionState = "offline" | "weak" | null;

interface ConnectionInfo {
  effectiveType?: string;
}

/**
 * Whether the person should be told the wait is the connection's. True when the
 * browser says it is offline, when it reports a 2G-class link while a request is
 * pending, or when a request has simply been pending about four seconds.
 */
export function useConnectionState(pending: boolean): ConnectionState {
  const [offline, setOffline] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
    if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
      setSlow(true);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  if (!pending && !offline) return null;
  if (offline) return "offline";
  return slow ? "weak" : null;
}

/**
 * The notice that sits above the card while something is waiting on the
 * network. `role="status"` is polite, so a screen reader hears it once.
 */
export function ConnectionNotice({ state }: { state: ConnectionState }) {
  if (!state) return null;
  const offline = state === "offline";

  return (
    <div
      role="status"
      className="flex items-center gap-3.5 rounded-[18px] border border-primary-soft bg-primary-tint px-4 py-3.5"
    >
      <SignalBars moving={!offline} />
      <div className="min-w-0">
        <p className="text-base leading-snug font-bold text-foreground">
          {offline ? "You're offline" : "Weak connection"}
        </p>
        <p className="text-sm leading-snug text-body-2">
          {offline ? "We'll continue when you're back." : "This may take a while."}
        </p>
      </div>
    </div>
  );
}

/** Shapes in the layout of the page that is loading; flat grey under reduced motion. */
export function WizardSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("wizard-skeleton rounded-xl", className)} />;
}

/**
 * Holds its children back for 200ms, so a load that is quick never flashes a
 * skeleton at all.
 */
export function AfterDelay({ ms = 200, children }: { ms?: number; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return ready ? <>{children}</> : null;
}
