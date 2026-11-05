import { QuietLink } from "~/components/quiet-link";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

const STEPS = [
  { step: 1, label: "Request details" },
  { step: 2, label: "Your details" },
  { step: 3, label: "Upload documents" },
  { step: 4, label: "Review and submit" },
] as const;

function formatSavedAt(updatedAt: string | null) {
  if (!updatedAt) return null;
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Saved just now";
  if (minutes === 1) return "Saved 1 minute ago";
  if (minutes < 60) return `Saved ${minutes} minutes ago`;
  return "Saved";
}

interface ApplyStepRailProps {
  currentStep: 1 | 2 | 3 | 4;
  draftUpdatedAt: string | null;
  /**
   * Given when there is a draft worth keeping: the mark then asks what to do
   * with it instead of leaving. Without it the mark simply goes to the dashboard.
   */
  onLeave?: () => void;
}

/**
 * The wizard's only chrome above the card. Tablet and laptop layouts give the
 * progress rail its own row; very wide screens place it beside the mark.
 */
export function ApplyStepRail({
  currentStep,
  draftUpdatedAt,
  onLeave,
}: ApplyStepRailProps) {
  const savedLabel = formatSavedAt(draftUpdatedAt);

  return (
    <header className="grid gap-4 px-5 pt-5 pb-4 sm:px-8 sm:pt-6 md:gap-5 md:px-10 md:pt-7 md:pb-6 2xl:grid-cols-[15rem_minmax(0,1fr)_15rem] 2xl:items-center 2xl:gap-6 2xl:px-14">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <QuietLink
          to="/dashboard"
          aria-label="CiviCheck, back to your dashboard"
          className="flex min-h-11 shrink-0 items-center gap-2.5 text-foreground"
          onClick={(event) => {
            // A plain click asks first. Opening it in a new tab (ctrl, cmd, shift)
            // leaves this page, and the draft, exactly where they are.
            if (!onLeave || event.ctrlKey || event.metaKey || event.shiftKey) {
              return;
            }
            event.preventDefault();
            onLeave();
          }}
        >
          <CiviCheckIdentity compact prominent />
        </QuietLink>

        {/* On phones the card title names the current step; this compact count
            gives the circles context without forcing four labels into one row. */}
        <span className="shrink-0 rounded-full border border-border-strong bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground md:hidden">
          Step {currentStep} of {STEPS.length}
        </span>
      </div>

      {/* Kept for assistive tech only: the draft-saved status is tracked and
          announced to screen readers, but not shown on screen. */}
      {savedLabel && <span className="sr-only">{savedLabel}</span>}

      <nav
        aria-label="Application progress"
        className="min-w-0 2xl:col-start-2"
      >
        <ol className="mx-auto flex w-full max-w-245 items-center gap-1.5 md:gap-2.5">
          {STEPS.map(({ step, label }, index) => {
            const isDone = step < currentStep;
            const isCurrent = step === currentStep;
            return (
              <li
                key={step}
                aria-current={isCurrent ? "step" : undefined}
                className="flex min-w-0 flex-1 items-center gap-1.5 last:flex-initial md:gap-2.5"
              >
                <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
                  <span
                    className={cn(
                      "flex size-8.5 shrink-0 items-center justify-center rounded-full border-2 text-[15px] font-bold transition-[background-color,color,border-color] duration-300 ease-out motion-reduce:transition-none md:size-9",
                      isDone
                        ? "border-success bg-success text-white dark:text-background"
                        : isCurrent
                          ? "border-primary-fill bg-primary-fill text-white"
                          : "border-border-strong bg-card text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <Check
                        className="civic-enter-scale size-4"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    ) : (
                      step
                    )}
                  </span>
                  {/* Full labels reflow the rail into an overflowing single line
                      below `md`, so the rail drops to circles-and-connectors
                      there; the wizard card's title names the step instead. */}
                  <span
                    className={cn(
                      "sr-only whitespace-nowrap transition-colors duration-300 motion-reduce:transition-none md:not-sr-only md:text-sm lg:text-[15px] xl:text-base",
                      isCurrent
                        ? "font-bold text-foreground"
                        : "font-medium text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  // The connector fills left-to-right as the step completes,
                  // instead of flipping colour in one frame. The track stays put
                  // and an overlay scales across it, so nothing reflows.
                  <div
                    aria-hidden="true"
                    className="relative h-0.75 flex-1 overflow-hidden rounded-full bg-border-strong"
                  >
                    <div
                      className={cn(
                        "absolute inset-0 origin-left rounded-full bg-success transition-transform duration-500 ease-out motion-reduce:transition-none",
                        isDone ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Balances the mark only in the wide, single-row desktop layout. */}
      <span className="hidden 2xl:block" aria-hidden="true" />
    </header>
  );
}
