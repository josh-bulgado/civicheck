/**
 * The five-stage CCRO workflow (CLAUDE.md §4) expressed as data.
 *
 * `requests.status` is the single source of truth for where a request sits.
 * Everything that moves a request must go through ALLOWED_TRANSITIONS so the
 * pipeline can't be skipped or run backwards by accident.
 */

export const REQUEST_STATUSES = [
  "submitted",
  "under_validation",
  "incomplete",
  "rejected",
  "processing",
  "pending_approval",
  "ready_for_release",
  "released",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type WorkflowStage = 1 | 2 | 3 | 4 | 5;

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  1: "Submission",
  2: "Validation",
  3: "Processing",
  4: "Approval",
  5: "Release",
};

export const STAGE_OF: Record<RequestStatus, WorkflowStage> = {
  submitted: 1,
  under_validation: 2,
  incomplete: 2,
  rejected: 2,
  processing: 3,
  pending_approval: 4,
  ready_for_release: 5,
  released: 5,
};

export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  submitted: ["under_validation", "rejected"],
  under_validation: ["incomplete", "processing", "rejected"],
  incomplete: ["under_validation", "rejected"],
  processing: ["pending_approval"],
  pending_approval: ["processing", "ready_for_release", "rejected"],
  // Payment is verified by the cashier before the document is handed over;
  // the released hop is guarded on payment_status in advanceRequestStatusFn.
  ready_for_release: ["released"],
  rejected: [],
  released: [],
};

/** Statuses that end the request's life — nothing transitions out of these. */
export const TERMINAL_STATUSES: RequestStatus[] = ["rejected", "released"];

export function isRequestStatus(value: string | null): value is RequestStatus {
  return !!value && (REQUEST_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: string | null, to: string): boolean {
  if (!isRequestStatus(from) || !isRequestStatus(to)) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: string | null): RequestStatus[] {
  return isRequestStatus(from) ? ALLOWED_TRANSITIONS[from] : [];
}

export function stageOf(status: string | null): WorkflowStage | null {
  return isRequestStatus(status) ? STAGE_OF[status] : null;
}

/**
 * Wording for the button that performs a transition. Keyed by destination —
 * the action reads the same regardless of where it was triggered from.
 */
export const TRANSITION_LABELS: Record<RequestStatus, string> = {
  submitted: "Return to submitted",
  under_validation: "Start validation",
  incomplete: "Mark incomplete",
  rejected: "Reject request",
  processing: "Mark requirements complete",
  pending_approval: "Send for approval",
  ready_for_release: "Approve for release",
  released: "Mark released",
};

/** Transitions that shouldn't be one click away — they need a reason. */
export const REASON_REQUIRED: RequestStatus[] = ["incomplete", "rejected"];

// Re-exported so existing badge call sites keep one import path for status UI.
export { getStatusDetails, getPaymentDetails } from "~/features/services/request-status";
