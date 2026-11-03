import type { DeskRequest } from "~/features/dashboard/staff-desk";
import { getStatusDetails } from "~/features/requests/request-workflow";
import { STAGE_TONES } from "~/features/requests/stage-tones";
import { cn } from "~/lib/utils";

/** A request's status, led by a dot in its stage's colour. The words say it all. */
export function StageStatus({
  request,
  className,
}: {
  request: Pick<DeskRequest, "stage" | "status">;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm whitespace-nowrap", className)}>
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", STAGE_TONES[request.stage].dot)}
      />
      {getStatusDetails(request.status).label}
    </span>
  );
}
