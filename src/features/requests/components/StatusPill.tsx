import { Badge } from "~/components/ui/badge";
import { getStatusDetails } from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";

/**
 * A request's status as the citizen portal shows it: the status Badge at pill
 * size (36px, 15px type), led by a dot in the same ink.
 *
 * Incomplete is the applicant's to fix, so it is the portal's red rather than
 * the amber the staff views give it.
 */
export function StatusPill({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  const details = getStatusDetails(status);

  return (
    <Badge
      variant={details.variant}
      className={cn(
        "h-9 gap-2 px-4 text-[15px] font-semibold",
        status === "incomplete" && "bg-portal-danger-soft text-destructive",
        className,
      )}
    >
      <span className="size-1.75 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {details.label}
    </Badge>
  );
}
