import { cleanStepText } from "~/features/services/service-utils";

interface HowItWorksCardProps {
  steps: string[] | null;
}

export function HowItWorksCard({ steps }: HowItWorksCardProps) {
  const cleanedSteps = (steps ?? [])
    .map(cleanStepText)
    .map((step) =>
      step.toLowerCase().startsWith("submit the request with complete attachments")
        ? "Submit the request online, with or without optional file attachments; CCRO checks the request, then registers and signs."
        : step,
    )
    .filter((s) => s.length > 0);

  if (cleanedSteps.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border-strong bg-white">
      <div className="border-b border-border-light px-5 py-4 text-base font-bold text-foreground">
        How it works
      </div>
      <div className="flex flex-col gap-3.5 px-5 py-4">
        {cleanedSteps.map((step, index) => (
          <div key={index} className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
              {index + 1}
            </span>
            <p className="text-sm leading-relaxed text-body-strong">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
