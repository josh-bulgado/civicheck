import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { healthStatusContent } from "../system-health.constants";
import type { HealthStatus } from "../system-admin.types";

export function HealthStatusBadge({ status }: { status: HealthStatus }) {
  const content = healthStatusContent[status];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-semibold", content.className)}
      aria-label={`${content.label} status`}
    >
      <span
        className={cn(
          "size-1.5 rounded-full ring-2 ring-current/10",
          content.dotClassName,
        )}
        aria-hidden="true"
      />
      {content.label}
    </Badge>
  );
}
