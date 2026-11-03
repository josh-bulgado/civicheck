import { LazyMotion, MotionConfig, m } from "framer-motion";
import type { ReactNode } from "react";

const loadMotionFeatures = () => import("framer-motion").then((mod) => mod.domAnimation);

// Same curves as `--ease-civic` / `--ease-civic-emphasized` in app.css.
const easeCivic = [0.22, 0.61, 0.36, 1] as const;
const easeEmphasized = [0.16, 1, 0.3, 1] as const;

/**
 * Motion for the decorative panels. The animation features load as a separate
 * chunk so the auth routes are not paying for them up front, and
 * `reducedMotion="user"` drops every transform for anyone who has asked their
 * OS for less movement. Stroke drawing and the focus ring are not transforms,
 * so app.css switches those off under the same media query.
 */
function PanelMotion({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures}>{children}</LazyMotion>
    </MotionConfig>
  );
}

/**
 * One of the two back sheets spreading out of a flat pile into its tilt.
 *
 * The resting tilt and offset live in app.css as the `rotate` and `translate`
 * properties. Framer writes `transform`, which stacks on top of those, so the
 * start pose here is the inverse of the resting one and the animation settles
 * to zero. Offsets are percentages of the sheet, converted from the `cqw`
 * values in the stylesheet, and rotated by the sheet's own tilt because CSS
 * applies `translate` and `rotate` before `transform`.
 */
function FanSheet({
  layer,
  from,
  opacity,
  delay,
}: {
  layer: 1 | 2;
  from: { rotate: number; x: string; y: string };
  opacity: number;
  delay: number;
}) {
  return (
    <m.div
      className="docket-sheet"
      data-layer={layer}
      initial={{ opacity: 0, ...from }}
      animate={{ opacity, rotate: 0, x: 0, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay,
        opacity: { duration: 0.2, delay },
      }}
    />
  );
}

/** The top sheet (or badge) rising onto the stack after the back sheets. */
const land = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.52, delay: 0.22, ease: easeEmphasized },
} as const;

/** The caption rising in underneath once everything above it has settled. */
function captionIn(delay: number) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.28, delay, ease: easeCivic },
  } as const;
}

/** The four points of the workflow an applicant actually watches for. */
const trackedSteps = [
  { label: "Filed online", note: "Mon", state: "done" },
  { label: "Documents verified", note: "Tue", state: "done" },
  { label: "Ready at the cashier", note: "Today", state: "current" },
  { label: "Claimed", note: null, state: "pending" },
] as const;

/** When each beat of the tracker plays, in seconds after mount. */
const stampTiming = {
  firstCheck: 0.36,
  checkGap: 0.28,
  ring: 1.0,
  pill: 1.12,
  stamp: 1.34,
  caption: 1.5,
} as const;

/**
 * Panel for the screens a resident reaches once they already have an account.
 * A fanned stack of request sheets, the top one stamped and marked ready for
 * release, hints at what is waiting on the other side without a feature list.
 * The back sheets spread out of a flat pile first, then the top sheet lands.
 *
 * The sheets are decorative, so they stay out of the accessibility tree.
 * Placeholder only: the stamp is text, because no MOA authorizes use of the
 * real CCRO seal artwork yet. Swap it for the emblem once that is in hand.
 */
export function AuthDocketPanel() {
  return (
    <PanelMotion>
      <aside className="docket-panel">
        <div className="docket-stage" aria-hidden="true">
          <div className="docket-group">
            <FanSheet layer={1} from={{ rotate: 9, x: "5.2%", y: "-4.6%" }} opacity={0.55} delay={0} />
            <FanSheet layer={2} from={{ rotate: 4, x: "1.6%", y: "-1.7%" }} opacity={0.8} delay={0.09} />
            <m.div className="docket-sheet" data-layer="3" {...land}>
              <div className="docket-stamp">CCRO</div>
              <div className="docket-skel w-[82%]" />
              <div className="docket-skel w-[64%]" />
              <div className="docket-skel w-[74%]" />
              <div className="docket-pill">Ready for release</div>
            </m.div>
          </div>
        </div>

        <m.div className="docket-caption" {...captionIn(0.94)}>
          <strong>Every request, filed to released.</strong>
          City Civil Registrar Office, Legazpi
        </m.div>
      </aside>
    </PanelMotion>
  );
}

/**
 * Panel for the create-account screen. The same stack of sheets, with the
 * request tracker on the top one: the promise being made, file once and then
 * watch it move, is easier to show than to describe.
 *
 * The tracker acts that out once on arrival. The check marks draw in order, the
 * current step pulses, and the CCRO stamp presses onto the sheet. It runs about
 * two seconds and never gates the form, which is usable from the first frame.
 *
 * The whole composition is decorative: it carries no live data, so it stays out
 * of the accessibility tree and the copy underneath does the talking.
 */
export function AuthProgressPanel() {
  return (
    <PanelMotion>
      <aside className="docket-panel" data-variant="tracker">
        <div className="docket-stage" aria-hidden="true">
          <div className="docket-group">
            <div className="docket-sheet" data-layer="1" />
            <div className="docket-sheet" data-layer="2" />
            <m.div
              className="docket-sheet"
              data-layer="3"
              initial={{ opacity: 0, scale: 0.97, y: 0 }}
              animate={{ opacity: 1, scale: 1, y: [0, 2, 0] }}
              transition={{
                opacity: { duration: 0.26, ease: easeEmphasized },
                scale: { duration: 0.26, ease: easeEmphasized },
                // A small thud as the stamp lands.
                y: { delay: stampTiming.stamp, duration: 0.2, times: [0, 0.45, 1] },
              }}
            >
              <div className="docket-track-head">
                Request status
                <m.span
                  className="docket-pill"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 16, delay: stampTiming.pill }}
                >
                  On track
                </m.span>
              </div>

              {trackedSteps.map((step, index) => (
                <div key={step.label} className="docket-step" data-state={step.state}>
                  {step.state === "done" ? (
                    <m.span
                      className="docket-dot"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: [0.8, 1.15, 1] }}
                      transition={{
                        duration: 0.24,
                        delay: stampTiming.firstCheck + index * stampTiming.checkGap,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-[calc(3.4cqw*var(--docket-scale))]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <m.path
                          className="docket-check"
                          d="M4 12l5 5L20 6"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{
                            duration: 0.26,
                            ease: easeEmphasized,
                            delay: stampTiming.firstCheck + 0.04 + index * stampTiming.checkGap,
                          }}
                        />
                      </svg>
                    </m.span>
                  ) : (
                    <span className="docket-dot">
                      {step.state === "current" ? (
                        <m.span
                          className="docket-ring"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.6, 0], scale: [1, 2.2] }}
                          transition={{ duration: 0.7, ease: "easeOut", delay: stampTiming.ring }}
                        />
                      ) : null}
                    </span>
                  )}
                  {step.label}
                  {step.note ? <small>{step.note}</small> : <small />}
                </div>
              ))}

              <m.div
                className="docket-foot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.24, delay: stampTiming.pill }}
              >
                3 of 4 steps done
              </m.div>

              <m.div
                className="docket-track-stamp"
                initial={{ opacity: 0, scale: 1.9, rotate: -6 }}
                animate={{ opacity: 0.88, scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 18,
                  delay: stampTiming.stamp,
                  opacity: { duration: 0.12, delay: stampTiming.stamp },
                }}
              >
                CCRO
              </m.div>
            </m.div>
          </div>
        </div>

        <m.div className="docket-caption" {...captionIn(stampTiming.caption)}>
          <h2>One account, every CCRO request.</h2>
          File online, follow each step, and visit once to pay and claim.
        </m.div>
      </aside>
    </PanelMotion>
  );
}

/**
 * Panel for the staff invitation page: a staff ID card on the same stack of
 * sheets, marked "Access pending" until the password is set. The card carries
 * no name, so it fits every invitation without personal data.
 *
 * Decorative, so it stays out of the accessibility tree. Placeholder only: the
 * mark is text until the real CCRO seal is cleared for use.
 */
export function AuthBadgePanel() {
  return (
    <PanelMotion>
      <aside className="docket-panel" data-variant="badge">
        <div className="docket-stage" aria-hidden="true">
          <div className="docket-group">
            <FanSheet layer={1} from={{ rotate: 9, x: "6.1%", y: "-3.8%" }} opacity={0.55} delay={0} />
            <FanSheet layer={2} from={{ rotate: 4, x: "1.9%", y: "-1.4%" }} opacity={0.8} delay={0.09} />
            <m.div className="docket-badge" {...land}>
              <div className="docket-slot" />
              <div className="docket-avatar">CCRO</div>
              <div className="docket-skel w-[62%]" />
              <div className="docket-skel w-[42%]" />
              <div className="docket-pill docket-pill--pending">Access pending</div>
            </m.div>
          </div>
        </div>

        <m.div className="docket-caption" {...captionIn(0.94)}>
          <h2>Welcome to the CCRO team.</h2>
          Your access starts when you finish setup.
        </m.div>
      </aside>
    </PanelMotion>
  );
}
