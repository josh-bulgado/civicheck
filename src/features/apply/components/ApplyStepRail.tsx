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
  if (minutes < 1) return "Draft saved just now";
  if (minutes === 1) return "Draft saved 1 minute ago";
  if (minutes < 60) return `Draft saved ${minutes} minutes ago`;
  return "Draft saved";
}

interface ApplyStepRailProps {
  currentStep: 1 | 2 | 3 | 4;
  draftUpdatedAt: string | null;
}

export function ApplyStepRail({ currentStep, draftUpdatedAt }: ApplyStepRailProps) {
  const savedLabel = formatSavedAt(draftUpdatedAt);

  return (
    <div className="border-b border-border-light bg-white">
      <div className="grid grid-cols-3 items-center gap-4 px-10 py-4.5">
        <Link to="/" aria-label="CiviCheck home">
          <CiviCheckIdentity compact />
        </Link>
        <p className="text-center text-base text-body">
          {savedLabel ?? "Filling out your application"}
        </p>
        <Link
          to="/my-requests"
          className="justify-self-end text-base font-bold text-primary hover:text-primary-hover"
        >
          Save and exit
        </Link>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border-light border-t border-border-light sm:grid-cols-4">
        {STEPS.map(({ step, label }) => {
          const isDone = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div
              key={step}
              className={`flex items-center gap-3 px-6 py-5 ${isCurrent ? "bg-primary-tint" : ""}`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  isDone
                    ? "bg-success text-white"
                    : isCurrent
                      ? "bg-primary text-white"
                      : "border border-control-border text-disabled"
                }`}
              >
                {isDone ? <Check className="size-4" /> : step}
              </span>
              <div className="min-w-0">
                <p
                  className={`truncate text-base font-bold ${
                    isCurrent || isDone ? "text-foreground" : "text-disabled"
                  }`}
                >
                  {label}
                </p>
                <p
                  className={`text-sm ${
                    isDone
                      ? "text-success"
                      : isCurrent
                        ? "text-primary"
                        : "text-disabled"
                  }`}
                >
                  {isDone ? "Done" : isCurrent ? "You are here" : "Next"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
