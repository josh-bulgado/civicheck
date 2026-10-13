import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";

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

export function ApplyStepRail({
  currentStep,
  draftUpdatedAt,
}: ApplyStepRailProps) {
  const savedLabel = formatSavedAt(draftUpdatedAt);

  return (
    <header className="border-b border-border-light bg-white">
      <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/dashboard" aria-label="Back to your dashboard" className="shrink-0">
            <CiviCheckIdentity compact className="[&>span:last-child]:hidden" />
          </Link>
          <span className="hidden text-lg font-bold text-foreground sm:inline">CiviCheck</span>
        </div>
        {/* Kept for assistive tech only: the draft-saved status is tracked and
            announced to screen readers, but not shown on screen. */}
        {savedLabel && <span className="sr-only">{savedLabel}</span>}
      </div>

      <nav aria-label="Application progress">
        <ol className="flex items-center gap-2 px-5 pt-3 pb-5.5 sm:gap-3 sm:px-8">
          {STEPS.map(({ step, label }, index) => {
            const isDone = step < currentStep;
            const isCurrent = step === currentStep;
            return (
              <li
                key={step}
                aria-current={isCurrent ? "step" : undefined}
                className="flex flex-1 items-center gap-3 last:flex-initial"
              >
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`flex size-6.5 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-[background-color,color,border-color] duration-300 ease-out motion-reduce:transition-none ${
                      isDone
                        ? "border-success bg-success text-white"
                        : isCurrent
                          ? "border-primary bg-primary text-white"
                          : "border-control-border bg-white text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <Check
                        className="civic-enter-scale size-3"
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
                    className={`sr-only whitespace-nowrap text-sm transition-colors duration-300 motion-reduce:transition-none sm:not-sr-only ${
                      isCurrent
                        ? "font-bold text-foreground"
                        : isDone
                          ? "font-medium text-body-strong"
                          : "font-medium text-muted-foreground"
                    }`}
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
                    className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-border"
                  >
                    <div
                      className={`absolute inset-0 origin-left rounded-full bg-success transition-transform duration-500 ease-out motion-reduce:transition-none ${
                        isDone ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}
