import { Badge } from "~/components/ui/badge";
import type { RealtimeStatus } from "~/hooks/useRealtimeRefresh";

const content = {
  live: {
    variant: "success",
    label: "Live",
    dotClassName: "bg-success-dot ring-2 ring-success/20 animate-pulse",
    title: "Connected. This table updates itself as accounts change.",
  },
  connecting: {
    variant: "neutral",
    label: "Connecting",
    dotClassName: "bg-muted-foreground/50",
    title: "Reconnecting to the live account feed.",
  },
  offline: {
    variant: "neutral",
    label: "Offline",
    dotClassName: "bg-muted-foreground/50",
    title: "Live updates are unavailable. Reload to see the latest accounts.",
  },
} as const satisfies Record<
  RealtimeStatus,
  { variant: string; label: string; dotClassName: string; title: string }
>;

export function RealtimeStatusBadge({ status }: { status: RealtimeStatus }) {
  const { variant, label, dotClassName, title } = content[status];

  return (
    <Badge
      variant={variant as "success" | "neutral"}
      className="gap-1.5 shrink-0"
      title={title}
    >
      <span
        className={`size-1.5 rounded-full ${dotClassName}`}
        aria-hidden="true"
      />
      <span className="sr-only">Live updates: </span>
      {label}
    </Badge>
  );
}
