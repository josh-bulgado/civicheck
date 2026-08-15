import { Button } from "~/components/ui/button";
import { getTicketStatusDetails, laneLabel, type QueueTicket } from "~/features/queue/queue.types";

const SOURCE_LABELS: Record<string, string> = {
  self_checkin: "Self check-in",
  frontdesk: "Front desk",
  walk_in: "Walk-in",
};

interface TicketCardProps {
  ticket: QueueTicket;
  busy?: boolean;
  onAction?: (action: "serving" | "served" | "no_show" | "cancelled") => void;
}

export function TicketCard({ ticket, busy, onAction }: TicketCardProps) {
  const status = getTicketStatusDetails(ticket.status);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white p-4">
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-lg font-extrabold tracking-tight text-primary">
          {ticket.ticketNumber}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">
            {ticket.applicantName ?? "Unnamed applicant"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {laneLabel(ticket.lane)}
            {ticket.trackingNumber ? ` · ${ticket.trackingNumber}` : ""}
            {ticket.serviceName ? ` · ${ticket.serviceName}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {SOURCE_LABELS[ticket.issueSource] ?? ticket.issueSource}
            {ticket.counterName ? ` · ${ticket.counterName}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${status.styles}`}
        >
          {status.label}
        </span>

        {onAction && ticket.status === "called" && (
          <Button size="sm" disabled={busy} onClick={() => onAction("serving")}>
            Start serving
          </Button>
        )}
        {onAction && ticket.status === "serving" && (
          <Button size="sm" disabled={busy} onClick={() => onAction("served")}>
            Complete
          </Button>
        )}
        {onAction && (ticket.status === "called" || ticket.status === "waiting") && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onAction("no_show")}
          >
            No show
          </Button>
        )}
      </div>
    </div>
  );
}
