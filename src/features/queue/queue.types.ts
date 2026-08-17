export const QUEUE_LANES = ["application", "releasing", "assistance"] as const;
export type QueueLane = (typeof QUEUE_LANES)[number];

export const TICKET_STATUSES = [
  "waiting",
  "called",
  "serving",
  "served",
  "no_show",
  "cancelled",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type IssueSource = "self_checkin" | "frontdesk" | "walk_in";

export const LANE_LABELS: Record<QueueLane, string> = {
  application: "New Application",
  releasing: "Releasing",
  assistance: "Assistance",
};

export const LANE_PREFIXES: Record<QueueLane, string> = {
  application: "A",
  releasing: "B",
  assistance: "C",
};

export function isQueueLane(value: string | null): value is QueueLane {
  return !!value && (QUEUE_LANES as readonly string[]).includes(value);
}

export function laneLabel(lane: string | null): string {
  return isQueueLane(lane) ? LANE_LABELS[lane] : (lane ?? "—");
}

export function getTicketStatusDetails(status: string | null) {
  switch (status) {
    case "waiting":
      return { label: "Waiting", styles: "status-neutral" };
    case "called":
      return { label: "Called", styles: "status-warning" };
    case "serving":
      return { label: "Now serving", styles: "border-primary/20 bg-primary-soft text-primary" };
    case "served":
      return { label: "Served", styles: "status-success" };
    case "no_show":
      return { label: "No show", styles: "status-error" };
    case "cancelled":
      return { label: "Cancelled", styles: "status-neutral" };
    default:
      return { label: status || "Unknown", styles: "status-neutral" };
  }
}

export interface QueueTicket {
  id: string;
  ticketNumber: string;
  lane: string;
  status: string;
  counterId: string | null;
  counterName: string | null;
  requestId: string | null;
  trackingNumber: string | null;
  applicantName: string | null;
  serviceName: string | null;
  issueSource: string;
  calledAt: string | null;
  createdAt: string;
}

export interface NowServingRow {
  ticketNumber: string;
  lane: string;
  status: string;
  counterId: string | null;
  counterName: string | null;
  calledAt: string | null;
}

export interface MyTicket {
  id: string;
  ticketNumber: string;
  lane: string;
  status: string;
  counterId: string | null;
  counterName: string | null;
  aheadCount: number;
  calledAt: string | null;
}

export interface QueueCounter {
  id: string;
  name: string;
  lane: string;
  isActive: boolean;
}
