import { QuietLink } from "~/components/quiet-link";
import { ChevronRight } from "lucide-react";
import type { ContinuableApplication } from "~/features/apply/hooks/useApplyDraft";
import { formatServiceCode } from "~/features/services/service-utils";

/**
 * An application the applicant started and left on this device. It sits under
 * the request they are tracking, never over it: tracking is what they came for.
 * Nothing when there is no application to continue. The dashboard reads the
 * draft itself, so it can hold a skeleton until the answer is known.
 */
export function ContinueApplicationCard({
  application,
}: {
  application: ContinuableApplication | null;
}) {
  if (!application) return null;

  // A draft saved before names were remembered falls back to its code.
  const name = application.serviceName ?? formatServiceCode(application.routeCode);

  return (
    <QuietLink
      to="/apply/$serviceCode/case"
      params={{ serviceCode: application.routeCode }}
      className="civic-press flex items-center gap-4 rounded-4xl bg-card px-5 py-3.5 shadow-portal-card hover:bg-primary-tint md:gap-5 md:px-7 md:py-3.5"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-snug font-semibold text-primary">
          Continue your application
        </span>
        <span className="block truncate text-[18px] leading-snug font-semibold text-foreground">
          {name}
        </span>
      </span>
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-portal-panel text-body-2"
        aria-hidden="true"
      >
        <ChevronRight className="size-4.5" />
      </span>
    </QuietLink>
  );
}
