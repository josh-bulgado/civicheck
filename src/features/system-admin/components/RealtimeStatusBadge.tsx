import { Badge } from "~/components/ui/badge";
import type { RealtimeStatus } from "~/hooks/useRealtimeRefresh";

const content = {
  live: {
    variant: "success",
    label: "Live",
    dotClassName: "bg-success-dot ring-2 ring-success/20 animate-pulse",
    title: "Connected. This page updates itself as {subject} change.",
  },
  connecting: {
    variant: "neutral",
    label: "Connecting",
    dotClassName: "bg-muted-foreground/50",
    title: "Reconnecting to the live {subject} feed.",
  },
  offline: {
    variant: "neutral",
    label: "Offline",
    dotClassName: "bg-muted-foreground/50",
    title: "Live updates are unavailable. Reload to see the latest {subject}.",
  },
} as const satisfies Record<
  RealtimeStatus,
  { variant: string; label: string; dotClassName: string; title: string }
>;

/** `subject` is what the page is following, in the plural: "accounts", "checks". */
export function RealtimeStatusBadge({
  status,
  subject = "accounts",
}: {
  status: RealtimeStatus;
  subject?: string;
}) {
  const { variant, label, dotClassName, title } = content[status];

  return (
    <Badge
      variant={variant as "success" | "neutral"}
      className="gap-1.5 shrink-0"
      title={title.replaceAll("{subject}", subject)}
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
