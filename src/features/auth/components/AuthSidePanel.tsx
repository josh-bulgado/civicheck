import { CheckIcon } from "lucide-react";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";
import { cn } from "~/lib/utils";

/** The four points of the workflow an applicant actually watches for. */
const trackedSteps = [
  { label: "Filed online", note: "Mon", state: "done" },
  { label: "Documents verified", note: "Tue", state: "done" },
  { label: "Ready at the cashier", note: "Today", state: "current" },
  { label: "Claimed", note: null, state: "pending" },
] as const;

/** Squares scattered into a panel corner, at the edge of legibility. */
function CornerSquares({
  className,
  size,
  opacities,
}: {
  className: string;
  size: string;
  opacities: readonly number[];
}) {
  return (
    <div
      className={cn("absolute grid grid-cols-3", className)}
      aria-hidden="true"
    >
      {opacities.map((opacity, index) => (
        <span
          key={index}
          className={cn("rounded-[5px] bg-white", size)}
          style={{ opacity }}
        />
      ))}
    </div>
  );
}

/**
 * Panel for the create-account screen. Two mocked-up fragments of the request
 * tracker sit above the pitch, because the promise being made — file once, then
 * watch it move — is easier to show than to describe.
 *
 * The whole composition is decorative: it carries no live data, so it stays out
 * of the accessibility tree and the copy underneath does the talking.
 */
export function AuthProgressPanel() {
  return (
    <aside className="civic-auth-panel relative flex h-full flex-col justify-center gap-9 overflow-hidden px-10">
      <CornerSquares
        className="top-11 right-8 gap-3.5 opacity-50"
        size="size-8.5"
        opacities={[0.06, 0.11, 0.05, 0.09, 0.04, 0.12]}
      />
      <CornerSquares
        className="bottom-8 left-9 gap-4 opacity-45"
        size="size-7.5"
        opacities={[0.05, 0.1, 0.04, 0.09, 0.05, 0.03]}
      />

      <div className="relative mx-auto h-75 w-full max-w-112" aria-hidden="true">
        <div
          className="civic-enter-scale absolute top-0 left-0 flex w-79 flex-col gap-3.5 rounded-xl bg-white px-4.5 pt-4 pb-3.5 shadow-[0_18px_40px_-16px_rgba(3,20,42,0.55)]"
          style={enterDelay(140)}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">
              Request status
            </span>
            <span className="rounded-[5px] bg-success-soft px-1.75 py-0.5 text-[11px] font-semibold text-success">
              On track
            </span>
          </div>

          <div className="civic-stagger flex flex-col gap-2.75">
            {trackedSteps.map((step, index) => (
              <div
                key={step.label}
                style={staggerStyle(index, 340)}
                className={cn(
                  "flex items-center gap-2.5 text-[12.5px]",
                  step.state === "current"
                    ? "font-semibold text-primary"
                    : step.state === "done"
                      ? "text-body"
                      : "text-disabled",
                )}
              >
                {step.state === "done" ? (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-white">
                    <CheckIcon className="size-2.5" strokeWidth={3} />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "size-4 shrink-0 rounded-full border-2",
                      step.state === "current"
                        ? "border-primary"
                        : "border-border-light",
                    )}
                  />
                )}
                {step.label}
                {step.note ? (
                  <span className="ml-auto font-normal text-muted-foreground">
                    {step.note}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div
          className="civic-enter-scale absolute right-0 bottom-0 flex w-44 flex-col items-center gap-3 rounded-xl bg-white p-4.5 shadow-[0_20px_44px_-14px_rgba(3,20,42,0.6)]"
          style={enterDelay(300)}
        >
          <div
            className="grid size-26 place-items-center rounded-full"
            style={{
              background:
                "conic-gradient(var(--primary) 0turn 0.75turn, var(--border-light) 0.75turn 1turn)",
            }}
          >
            <div className="flex size-17 flex-col items-center justify-center rounded-full bg-white">
              <span className="text-[10.5px] text-muted-foreground">
                Complete
              </span>
              <span className="text-[19px] font-bold text-foreground tabular-nums">
                75%
              </span>
            </div>
          </div>
          <span className="text-center text-xs text-muted-2">
            3 of 4 steps done
          </span>
        </div>
      </div>

      <div
        className="civic-enter-sm flex flex-col items-center gap-2.5 text-center"
        style={enterDelay(420)}
      >
        <h2 className="text-xl font-bold tracking-[-0.01em] text-white">
          One account, every CCRO request
        </h2>
        <p className="max-w-[36ch] text-[13.5px] leading-relaxed text-pretty text-white/75">
          File online, follow each step, and visit once to pay and claim.
        </p>
      </div>
    </aside>
  );
}

/**
 * Panel for the screens a resident reaches once they already have an account.
 * Nothing to sell here, so it carries the office seal on a tinted field and
 * leaves the form to hold attention.
 */
export function AuthEmblemPanel() {
  return (
    <aside className="flex h-full items-center justify-center bg-auth-panel-tint px-11">
      <div className="civic-enter-scale flex flex-col items-center gap-7">
        <img
          src="/brand/ccro-emblem.png"
          alt=""
          className="w-full max-w-80 object-contain xl:max-w-88"
        />
        <p className="text-center text-[13px] font-medium text-primary-hover">
          City Civil Registrar Office · City Government of Legazpi
        </p>
      </div>
    </aside>
  );
}
