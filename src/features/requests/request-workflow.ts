/**
 * The four-stage CCRO workflow (CLAUDE.md §4) expressed as data.
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
  "ready_for_release",
  "released",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type WorkflowStage = 1 | 2 | 3 | 4;

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  1: "Submission",
  2: "Validation",
  3: "Processing",
  4: "Release",
};

export const STAGE_OF: Record<RequestStatus, WorkflowStage> = {
  submitted: 1,
  under_validation: 2,
  incomplete: 2,
  rejected: 2,
  processing: 3,
  ready_for_release: 4,
  released: 4,
};

// NOTE: the staff-notification trigger `trg_notify_request_status_changed`
// (latest: supabase/migrations/20261029121000_route_repaid_release_to_admin.sql)
// mirrors these hops in SQL: ready_for_release only out of processing,
// incomplete only out of under_validation, rejected only out of an open stage.
// Change one side without the other and the alerts silently stop.
// The database guard `guard_request_workflow`
// (latest: supabase/migrations/20261029120000_hold_documents_through_release.sql)
// also lists every hop, and refuses any other: add a hop here and it must be
// added there too.
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  submitted: ["under_validation", "rejected"],
  under_validation: ["incomplete", "processing", "rejected"],
  incomplete: ["under_validation", "rejected"],
  // No registrar sign-off step: whoever prepares the record marks it ready.
  // Rejection stays reachable here so an in-processing request isn't trapped.
  // Processing and release both assume every uploaded requirement is accepted,
  // so reopening a document decision sends the request back to validation (done
  // automatically by the attachment mutations; also offered as a manual
  // "Return to validation"). See RETURNABLE_TO_VALIDATION.
  processing: ["ready_for_release", "under_validation", "rejected"],
  // Payment is verified by the cashier before the document is handed over;
  // the released hop is guarded on payment_status in advanceRequestStatusFn.
  // A payment already verified stays verified if the request is sent back.
  ready_for_release: ["released", "under_validation"],
  rejected: [],
  released: [],
};

/**
 * Statuses that presuppose every uploaded requirement is accepted. A request in
 * one of these goes back to validation when a document stops being accepted.
 */
export const RETURNABLE_TO_VALIDATION: RequestStatus[] = [
  "processing",
  "ready_for_release",
];

/**
 * Services where "requirements complete" (the move into processing) only
 * accepts the uploaded copy: the applicant must then visit the office with the
 * hard copies for staff's final validation, before the request can be marked
 * ready for release. On-time and delayed marriage, birth and death registration
 * all work this way.
 */
const OFFICE_FINAL_VALIDATION_SERVICE_CODES = [
  "MARRIAGE_ONTIME",
  "MARRIAGE_DELAYED",
  "OTCOLB-MARITAL",
  "OTCOLB-NONMARITAL",
  "DCOLB-0079-BRAP",
  "DCOLB-0079-NORMAL-MARITAL",
  "DCOLB-0079-NORMAL-NONMARITAL",
  "DCOLB-80UP-BRAP",
  "DCOLB-80UP-NORMAL-MARITAL",
  "DCOLB-80UP-NORMAL-NONMARITAL",
  "DEATH_ONTIME",
  "DEATH_DELAYED",
];

export function needsOfficeFinalValidation(serviceCode: string | null | undefined): boolean {
  return (
    !!serviceCode &&
    OFFICE_FINAL_VALIDATION_SERVICE_CODES.includes(serviceCode.toUpperCase())
  );
}

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
  ready_for_release: "Mark ready for release",
  released: "Mark released",
};

/**
 * The button text for a specific hop. Most hops read the same wherever they
 * start, but going back from processing or release is a return, not a first
 * validation.
 */
export function getTransitionLabel(
  from: string | null,
  to: RequestStatus,
): string {
  if (
    to === "under_validation" &&
    RETURNABLE_TO_VALIDATION.includes(from as RequestStatus)
  ) {
    return "Return to validation";
  }
  return TRANSITION_LABELS[to];
}

/** Transitions that shouldn't be one click away — they need a reason. */
export const REASON_REQUIRED: RequestStatus[] = ["incomplete", "rejected"];

/**
 * A request can be released only once the cashier has verified payment — or,
 * for a fee-free request, confirmed that no fee is due. Both leave
 * `payment_status` at "verified". Shared by the release button and the
 * server-side release check.
 */
export function isPaymentSettled(paymentStatus: string | null): boolean {
  return paymentStatus === "verified";
}

// Re-exported so existing badge call sites keep one import path for status UI.
export {
  getStatusDetails,
  getPaymentDetails,
  getCurrentDotClass,
  getLogNote,
  getRejectionNotice,
  getRejectionReason,
} from "~/features/services/request-status";
