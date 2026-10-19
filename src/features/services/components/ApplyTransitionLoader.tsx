import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/** A serviceCode segment is required, so `/apply/` (which redirects) doesn't count. */
const APPLY_PATH = /^\/apply\/[^/]+/;

/**
 * The checklist loops for as long as the navigation is pending. These mirror
 * the `civic-apply-line` keyframes in app.css — a line is drawn from 40% of the
 * cycle until 88%, then fades before the next pass — and the stagger between
 * lines. They exist so the stamp can wait for a moment when every line is fully
 * drawn: the loop is frozen at that instant, so the sheet never jumps.
 */
const LINE_CYCLE_MS = 1600;
const LINE_STAGGER_MS = 120;
const LINE_COUNT = 3;
const DRAWN_FROM_MS = LINE_CYCLE_MS * 0.4 + (LINE_COUNT - 1) * LINE_STAGGER_MS;
const DRAWN_UNTIL_MS = LINE_CYCLE_MS * 0.88;
/** Keep clear of the window's edges so timer jitter can't land outside it. */
const DRAWN_MARGIN_MS = 60;

/** Milliseconds from now until every line of the looping checklist is drawn. */
function msUntilChecklistDrawn(elapsedMs: number): number {
  const at = elapsedMs % LINE_CYCLE_MS;
  const from = DRAWN_FROM_MS + DRAWN_MARGIN_MS;
  const until = DRAWN_UNTIL_MS - DRAWN_MARGIN_MS;
  if (at >= from && at <= until) return 0;
  return at < from ? from - at : LINE_CYCLE_MS - at + from;
}

/** How long the landed stamp is held so it reads before the overlay fades. */
const STAMP_HOLD_MS = 550;
const EXIT_MS = 200;

/**
 * `leaving` is the exit after a stamp; `dismissed` is the same fade for a
 * navigation that never earned one, so the overlay can tell them apart.
 */
type Phase = "idle" | "loading" | "stamped" | "leaving" | "dismissed";

/**
 * Full-screen hand-off into the apply flow: a sheet's checklist draws in on a
 * loop while the navigation is pending, and the CCRO stamp lands on it only
 * once the navigation has resolved — the stamp is the completion mark, so no
 * stamp means still working. It's driven by the router rather than by the button
 * that was clicked, so every way into `/apply/:serviceCode` gets it — the
 * confirm dialog, the checklist dialog, a "Start application" link — and it
 * lives in the root route, so it survives the page underneath being swapped
 * out when the apply layout renders.
 *
 * If the navigation ends somewhere other than the apply flow — a redirect to
 * sign in, an error, a not-found page — the stamp is skipped: stamping that as
 * "ready" would be a lie.
 *
 * "Entering" means a navigation is pending to an apply URL from somewhere that
 * isn't already inside the flow, so stepping between case → details →
 * documents → review never triggers it.
 */
export function ApplyTransitionLoader() {
  const entering = useRouterState({
    select: (state) =>
      state.status === "pending" &&
      APPLY_PATH.test(state.location.pathname) &&
      !APPLY_PATH.test(state.resolvedLocation?.pathname ?? ""),
  });
  // The stamp says "ready", so it is only earned by a navigation that ended
  // inside the apply flow without an error — not one that was redirected away
  // (e.g. to sign in) or that landed on an error / not-found page.
  const failed = useRouterState({
    select: (state) =>
      !APPLY_PATH.test(state.location.pathname) ||
      state.matches.some(
        (match) => match.status === "error" || match.status === "notFound",
      ),
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [startedAt, setStartedAt] = useState(0);

  // Derived from router state, so adjust during render rather than in an
  // effect: the overlay then appears in the same render the navigation starts
  // instead of one frame later. Guarded, so it settles after one pass.
  if (entering && phase !== "loading") {
    setPhase("loading");
    setStartedAt(Date.now());
  }

  useEffect(() => {
    if (phase === "loading" && !entering) {
      if (failed) {
        setPhase("dismissed");
        return;
      }
      const wait = msUntilChecklistDrawn(Date.now() - startedAt);
      const timer = setTimeout(() => setPhase("stamped"), wait);
      return () => clearTimeout(timer);
    }
    if (phase === "stamped") {
      const timer = setTimeout(() => setPhase("leaving"), STAMP_HOLD_MS);
      return () => clearTimeout(timer);
    }
    if (phase === "leaving" || phase === "dismissed") {
      const timer = setTimeout(() => setPhase("idle"), EXIT_MS);
      return () => clearTimeout(timer);
    }
  }, [phase, entering, failed, startedAt]);

  if (phase === "idle") return null;

  const stamped = phase === "stamped" || phase === "leaving";

  return (
    <div
      role="status"
      aria-live="polite"
      data-leaving={phase === "leaving" || phase === "dismissed" ? "" : undefined}
      className="civic-apply-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center gap-9 bg-background px-6 text-center"
    >
      <div aria-hidden="true" className="relative">
        <div
          data-stamped={stamped ? "" : undefined}
          className="civic-apply-sheet group relative h-56 w-44 rounded-xl border border-border bg-card p-5 shadow-lg"
        >
          <div className="mb-5 h-1.5 w-1/3 rounded-full bg-brand-gold" />
          <div className="flex flex-col gap-4">
            {["w-full", "w-5/6", "w-2/3"].map((width, index) => (
              <div key={width} className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-[3px] border-2 border-primary/40 transition-colors duration-(--duration-base) group-data-[stamped]:border-primary group-data-[stamped]:bg-primary/15" />
                <span
                  className={`civic-apply-line h-1.5 rounded-full bg-border-strong ${width}`}
                  style={{
                    animationDelay: `${index * LINE_STAGGER_MS}ms`,
                    animationDuration: `${LINE_CYCLE_MS}ms`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {stamped ? (
          <span className="civic-apply-stamp absolute -bottom-5 -right-7 flex size-20 items-center justify-center rounded-full border-4 border-primary text-primary">
            <span className="flex size-[3.75rem] items-center justify-center rounded-full border border-primary/60 text-[13px] font-extrabold tracking-tight">
              CCRO
            </span>
          </span>
        ) : null}
      </div>

      <div>
        <p className="text-lg font-bold tracking-tight text-foreground">
          {stamped ? "Your application is ready" : "Preparing your application"}
        </p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {stamped
            ? "Taking you to your checklist."
            : "Getting your checklist and forms ready."}
        </p>
      </div>
    </div>
  );
}
