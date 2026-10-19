import { CheckIcon } from "lucide-react";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";

/** The four points of the workflow an applicant actually watches for. */
const trackedSteps = [
  { label: "Filed online", note: "Mon", state: "done" },
  { label: "Documents verified", note: "Tue", state: "done" },
  { label: "Ready at the cashier", note: "Today", state: "current" },
  { label: "Claimed", note: null, state: "pending" },
] as const;

/**
 * Panel for the screens a resident reaches once they already have an account.
 * A fanned stack of request sheets, the top one stamped and marked ready for
 * release, hints at what is waiting on the other side without a feature list.
 *
 * The sheets are decorative, so they stay out of the accessibility tree.
 * Placeholder only: the stamp is text, because no MOA authorizes use of the
 * real CCRO seal artwork yet. Swap it for the emblem once that is in hand.
 */
export function AuthDocketPanel() {
  return (
    <aside className="docket-panel">
      <div className="docket-stage" aria-hidden="true">
        <div className="docket-group">
          <div className="docket-sheet" data-layer="1" />
          <div className="docket-sheet" data-layer="2" />
          <div
            className="docket-sheet civic-enter-scale"
            data-layer="3"
            style={enterDelay(140)}
          >
            <div className="docket-stamp">CCRO</div>
            <div className="docket-skel w-[82%]" />
            <div className="docket-skel w-[64%]" />
            <div className="docket-skel w-[74%]" />
            <div className="docket-pill">Ready for release</div>
          </div>
        </div>
      </div>

      <div className="docket-caption civic-enter-sm" style={enterDelay(420)}>
        <strong>Every request, filed to released.</strong>
        City Civil Registrar Office, Legazpi
      </div>
    </aside>
  );
}

/**
 * Panel for the create-account screen. The same stack of sheets, with the
 * request tracker on the top one: the promise being made, file once and then
 * watch it move, is easier to show than to describe.
 *
 * The whole composition is decorative: it carries no live data, so it stays out
 * of the accessibility tree and the copy underneath does the talking.
 */
export function AuthProgressPanel() {
  return (
    <aside className="docket-panel" data-variant="tracker">
      <div className="docket-stage" aria-hidden="true">
        <div className="docket-group">
          <div className="docket-sheet" data-layer="1" />
          <div className="docket-sheet" data-layer="2" />
          <div
            className="docket-sheet civic-enter-scale"
            data-layer="3"
            style={enterDelay(140)}
          >
            <div className="docket-track-head">
              Request status
              <span className="docket-pill">On track</span>
            </div>

            <div className="civic-stagger contents">
              {trackedSteps.map((step, index) => (
                <div
                  key={step.label}
                  className="docket-step"
                  data-state={step.state}
                  style={staggerStyle(index, 340)}
                >
                  <span className="docket-dot">
                    {step.state === "done" ? (
                      <CheckIcon className="size-[calc(3.4cqw*var(--docket-scale))]" strokeWidth={3} />
                    ) : null}
                  </span>
                  {step.label}
                  {step.note ? <small>{step.note}</small> : <small />}
                </div>
              ))}
            </div>

            <div className="docket-foot">3 of 4 steps done</div>
          </div>
        </div>
      </div>

      <div className="docket-caption civic-enter-sm" style={enterDelay(420)}>
        <h2>One account, every CCRO request.</h2>
        File online, follow each step, and visit once to pay and claim.
      </div>
    </aside>
  );
}
