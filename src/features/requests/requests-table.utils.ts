import {
  UNASSIGNED_DEPARTMENT_FILTER,
  isInStage,
  type RequestQueueFilters,
} from "./request-queue";
import { isPaymentSettled, stageOf, type WorkflowStage } from "./request-workflow";
import { isRequestClaimActive } from "./request-claims";
import type { StaffRequestRow } from "./requests.queries";

type TurnFields = Pick<StaffRequestRow, "status" | "paymentStatus">;

export type StageCounts = Record<"all" | WorkflowStage, number>;

// ─── Whose move it is ────────────────────────────────────────────────────────

/**
 * Who has the next move on a request. It tells staff which rows are theirs, and
 * it decides which waits are worth colouring: a request sitting with the
 * applicant is not a delay staff can fix.
 */
export type RequestTurn = "staff" | "applicant" | "payment" | "none";

export function requestTurn({ status, paymentStatus }: TurnFields): RequestTurn {
  switch (status) {
    // Missing documents: the applicant has to upload or bring them.
    case "incomplete":
      return "applicant";
    // The record is ready. Paid, staff hand it over; unpaid, release is blocked
    // until the applicant pays at the cashier.
    case "ready_for_release":
      return isPaymentSettled(paymentStatus) ? "staff" : "payment";
    case "cancelled":
    case "released":
    case "rejected":
      return "none";
    default:
      return "staff";
  }
}

export function needsStaff(request: TurnFields): boolean {
  return requestTurn(request) === "staff";
}

// ─── Filtering ───────────────────────────────────────────────────────────────

/** Case-insensitive match on tracking number, applicant or service. */
export function matchesSearch(
  request: Pick<StaffRequestRow, "trackingNumber" | "applicantName" | "serviceName">,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    request.trackingNumber.toLowerCase().includes(needle) ||
    request.applicantName.toLowerCase().includes(needle) ||
    request.serviceName.toLowerCase().includes(needle)
  );
}

export function matchesDepartment(
  request: Pick<StaffRequestRow, "departmentId">,
  department: string | undefined,
): boolean {
  if (!department) return true;
  return department === UNASSIGNED_DEPARTMENT_FILTER
    ? request.departmentId == null
    : request.departmentId === department;
}

export interface RequestCriteria extends RequestQueueFilters {
  search?: string;
  /** Shared loader clock, so SSR and hydration agree on overdue rows. */
  now?: number;
}

/** The rows that pass every filter. The stage chips ignore `stage` to count. */
export function filterRequests(
  requests: ReadonlyArray<StaffRequestRow>,
  {
    search = "",
    stage,
    status,
    payment,
    department,
    needs,
    mine,
    attention,
    now = Date.now(),
  }: RequestCriteria,
): StaffRequestRow[] {
  return requests.filter(
    (request) =>
      matchesSearch(request, search) &&
      (!stage || isInStage(request.status, stage)) &&
      (!status || request.status === status) &&
      (!payment ||
        (stageOf(request.status) === 4 &&
          request.feesDue > 0 &&
          isPaymentSettled(request.paymentStatus) === (payment === "verified"))) &&
      matchesDepartment(request, department) &&
      (!needs || needsStaff(request)) &&
      (!mine || isMyWork(request, now)) &&
      (!attention || needsAttention(request, now)),
  );
}

/** Payment is relevant in the full queue and while viewing Release-stage work. */
export function showsPaymentColumn({
  stage,
  status,
}: Pick<RequestQueueFilters, "stage" | "status">): boolean {
  if (status) return stageOf(status) === 4;
  return stage === undefined || stage === 4;
}

/** Counts behind the stage chips: they are both the overview and the filter. */
export function countByStage(
  requests: ReadonlyArray<Pick<StaffRequestRow, "status">>,
): StageCounts {
  const counts: StageCounts = { all: requests.length, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const { status } of requests) {
    const stage = stageOf(status);
    if (stage) counts[stage] += 1;
  }
  return counts;
}

export function countNeedingStaff(requests: ReadonlyArray<TurnFields>): number {
  return requests.filter(needsStaff).length;
}

/** A request belongs to My work only while the viewer's stage claim is active. */
export function isMyWork(
  request: Pick<StaffRequestRow, "claim" | "status">,
  now: number,
): boolean {
  return (
    isRequestClaimActive(request.claim, request.status, now) &&
    request.claim.isMine
  );
}

export function countNeedingAttention(
  requests: ReadonlyArray<
    TurnFields & Pick<StaffRequestRow, "updatedAt">
  >,
  now: number,
): number {
  return requests.filter((request) => needsAttention(request, now)).length;
}

// ─── Time in stage ───────────────────────────────────────────────────────────

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Waits that turn the In stage figure amber and red. Placeholders until the
 * office settles on a rule: the plan is each service's own processing time.
 */
export const WAIT_WARNING_MS = 3 * DAY_MS;
export const WAIT_CRITICAL_MS = 5 * DAY_MS;

/**
 * Completed minutes under an hour, hours under a day, then days. During the
 * second day only, include the remaining whole hours (for example, "1d 5h").
 * Measured from `updatedAt`, which also moves when payment is verified, so it
 * restarts at that point.
 */
export function formatTimeInStage(updatedAt: string, now: number): string {
  const elapsed = Math.max(0, now - Date.parse(updatedAt));
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h`;

  const days = Math.floor(elapsed / DAY_MS);
  const hours = Math.floor((elapsed % DAY_MS) / HOUR_MS);
  return days === 1 && hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export type WaitTone = "quiet" | "normal" | "warning" | "critical";

/** Only a wait on staff is coloured. Everyone else's wait stays quiet. */
export function waitTone(
  request: TurnFields & Pick<StaffRequestRow, "updatedAt">,
  now: number,
): WaitTone {
  if (!needsStaff(request)) return "quiet";
  const elapsed = now - Date.parse(request.updatedAt);
  if (elapsed >= WAIT_CRITICAL_MS) return "critical";
  if (elapsed >= WAIT_WARNING_MS) return "warning";
  return "normal";
}

/** An attention item is a staff-owned wait at or beyond the warning threshold. */
export function needsAttention(
  request: TurnFields & Pick<StaffRequestRow, "updatedAt">,
  now: number,
): boolean {
  const tone = waitTone(request, now);
  return tone === "warning" || tone === "critical";
}

/** Larger than any epoch-millisecond timestamp, so turns never interleave. */
const TURN_STEP = 1e14;

const TURN_RANK: Record<RequestTurn, number> = {
  staff: 2,
  applicant: 1,
  payment: 1,
  none: 0,
};

/**
 * Sort key for the In stage column. Descending puts requests waiting on staff
 * first and the longest wait on top; closed requests sink to the bottom. It
 * needs no clock, so the order is the same on the server and in the browser.
 */
export function waitingRank(
  request: TurnFields & Pick<StaffRequestRow, "updatedAt">,
): number {
  return (
    TURN_RANK[requestTurn(request)] * TURN_STEP -
    (Date.parse(request.updatedAt) || 0)
  );
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export type PaymentDisplay = "paid" | "unpaid" | "no_fee" | "none";

/**
 * What the Payment column says. Payment only becomes relevant in Release;
 * earlier stages stay blank in the full queue instead of reading as overdue.
 */
export function paymentDisplay({
  status,
  paymentStatus,
  feesDue,
}: TurnFields & Pick<StaffRequestRow, "feesDue">): PaymentDisplay {
  if (stageOf(status) !== 4) return "none";
  if (feesDue <= 0) return "no_fee";
  return isPaymentSettled(paymentStatus) ? "paid" : "unpaid";
}
