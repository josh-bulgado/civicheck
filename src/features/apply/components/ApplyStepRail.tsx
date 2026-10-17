import { QuietLink } from "~/components/quiet-link";
import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

const STEPS = [
  { step: 1, label: "About your case" },
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
}

/**
 * The wizard's only chrome above the card: the mark at the left, the four steps
 * centred, nothing at the right. It sits straight on the gradient ground.
 */
export function ApplyStepRail({
  currentStep,
  draftUpdatedAt,
}: ApplyStepRailProps) {
  const savedLabel = formatSavedAt(draftUpdatedAt);

  return (
    <header className="flex flex-col gap-4 px-5 pt-5 pb-4 sm:px-8 md:flex-row md:items-center md:gap-6 md:px-14 md:pt-7 md:pb-6.5">
      <QuietLink
        to="/dashboard"
        aria-label="CiviCheck, back to your dashboard"
        className="flex shrink-0 items-center gap-2.5 text-foreground md:w-60"
      >
        {/* Text stand-in: the official emblem isn't cleared for use yet. */}
        <span
          className="flex size-10.5 shrink-0 items-center justify-center rounded-full border-2 border-brand-gold bg-white text-[10px] font-extrabold tracking-[0.02em] text-primary"
          aria-hidden="true"
        >
          CCRO
        </span>
        <span className="text-[23px] font-semibold tracking-[-0.02em]">CiviCheck</span>
      </QuietLink>

      {/* Kept for assistive tech only: the draft-saved status is tracked and
          announced to screen readers, but not shown on screen. */}
      {savedLabel && <span className="sr-only">{savedLabel}</span>}

      <nav aria-label="Application progress" className="min-w-0 md:flex-1">
        <ol className="flex items-center gap-2 md:mx-auto md:max-w-245 md:gap-3.5">
          {STEPS.map(({ step, label }, index) => {
            const isDone = step < currentStep;
            const isCurrent = step === currentStep;
            return (
              <li
                key={step}
                aria-current={isCurrent ? "step" : undefined}
                className="flex flex-1 items-center gap-2 last:flex-initial md:gap-3.5"
              >
                <div className="flex shrink-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-8.5 shrink-0 items-center justify-center rounded-full border-2 text-[15px] font-bold transition-[background-color,color,border-color] duration-300 ease-out motion-reduce:transition-none",
                      isDone
                        ? "border-success bg-success text-white"
                        : isCurrent
                          ? "border-primary bg-primary text-white"
                          : "border-[#b9c7de] bg-white text-muted-foreground",
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
                      below `sm`, so the rail drops to circles-and-connectors
                      there; the wizard card's title names the step instead. */}
                  <span
                    className={cn(
                      "sr-only text-[17px] whitespace-nowrap transition-colors duration-300 motion-reduce:transition-none md:not-sr-only",
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
                    className="relative h-0.75 flex-1 overflow-hidden rounded-full bg-[#cfd8e8]"
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

      {/* Balances the mark, so the steps stay centred under the card. */}
      <span className="hidden md:block md:w-60" aria-hidden="true" />
    </header>
  );
}
