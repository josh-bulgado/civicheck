import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";

const STEPS = [
  { step: 1, label: "Your details" },
  { step: 2, label: "About your case" },
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
  serviceName: string;
  draftUpdatedAt: string | null;
}

export function ApplyStepRail({
  currentStep,
  serviceName,
  draftUpdatedAt,
}: ApplyStepRailProps) {
  const savedLabel = formatSavedAt(draftUpdatedAt);

  return (
    <div className="border-b border-border-light bg-white">
      <div className="flex items-center justify-between gap-4 px-7 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" aria-label="CiviCheck home" className="shrink-0">
            <CiviCheckIdentity compact className="[&>span:last-child]:hidden" />
          </Link>
          <span className="text-lg font-bold text-foreground">CiviCheck</span>
          <div className="h-4.5 w-px shrink-0 bg-border-light" />
          <span className="truncate text-sm text-muted-foreground">
            {serviceName} · draft in progress
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-4.5">
          {savedLabel && <span className="text-sm text-muted-foreground">{savedLabel}</span>}
          <Link
            to="/my-requests"
            className="text-sm font-bold text-primary hover:text-primary-hover"
          >
            Save and exit
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 px-7 py-3">
        {STEPS.map(({ step, label }, index) => {
          const isDone = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div key={step} className="flex flex-1 items-center gap-3 last:flex-initial">
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`flex size-5.5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-primary text-white"
                        : "border border-control-border text-disabled"
                  }`}
                >
                  {isDone ? <Check className="size-3" /> : step}
                </span>
                <span
                  className={`whitespace-nowrap text-sm ${
                    isCurrent
                      ? "font-bold text-foreground"
                      : isDone
                        ? "text-body-strong"
                        : "text-disabled"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.75 flex-1 rounded-full ${isDone ? "bg-success" : "bg-border-light"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
