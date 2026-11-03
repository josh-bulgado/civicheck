import { cn } from "~/lib/utils";
import { getStatusBadgeVariant } from "../request-queue";
import { STAGE_LABELS, STAGE_OF, isRequestStatus } from "../request-workflow";

type StatusTone = ReturnType<typeof getStatusBadgeVariant>;

// The dot colours of the status badge's own tone, so the bar reads as part of it.
const FILLED_SEGMENT: Record<StatusTone, string> = {
  warning: "bg-health-warning-dot",
  info: "bg-health-info-dot",
  destructive: "bg-health-error-dot",
  success: "bg-health-success-dot",
  neutral: "bg-health-neutral-dot",
};

const STAGE_COUNT = Object.keys(STAGE_LABELS).length;

/**
 * Four segments, one per workflow stage, filled up to the request's current
 * one. Beside the status badge it shows how far along a request is while
 * scanning a long list.
 */
export function StageTracker({ status }: { status: string | null }) {
  const stage = isRequestStatus(status) ? STAGE_OF[status] : 0;
  const filled = FILLED_SEGMENT[getStatusBadgeVariant(status)];

  return (
    <span
      role="img"
      aria-label={
        stage ? `Stage ${stage} of ${STAGE_COUNT}: ${STAGE_LABELS[stage]}` : "No stage"
      }
      className="flex shrink-0 gap-0.5"
    >
      {Array.from({ length: STAGE_COUNT }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            "h-1 w-3 rounded-full",
            index < stage ? filled : "bg-border-strong",
          )}
        />
      ))}
    </span>
  );
}
