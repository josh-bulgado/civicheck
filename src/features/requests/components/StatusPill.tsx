import { Badge } from "~/components/ui/badge";
import { getStatusDetails } from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";

/**
 * A request's status as the citizen portal shows it: the status Badge at pill
 * size, led by a dot in the same ink.
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
      className={cn("h-6.5 gap-1.5 px-2.5 font-semibold", className)}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {details.label}
    </Badge>
  );
}
