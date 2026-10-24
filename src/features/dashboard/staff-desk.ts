import { STAGES } from "~/features/requests/request-queue";
import {
  STAGE_LABELS,
  STAGE_OF,
  isRequestStatus,
  type RequestStatus,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import {
  formatTimeInStage,
  requestTurn,
  waitTone,
  WAIT_CRITICAL_MS,
  type WaitTone,
} from "~/features/requests/requests-table.utils";
import type { StaffRequestRow } from "~/features/requests/requests.queries";

/** The columns of a request the staff dashboard needs. */
export type DeskSourceRow = Pick<
  StaffRequestRow,
  | "id"
  | "trackingNumber"
  | "applicantName"
  | "serviceName"
  | "status"
  | "paymentStatus"
  | "updatedAt"
>;

/** How long a request has been in its status, in the words the dashboard uses. */
export interface DeskWait {
  /** The queue's own figure: "5h", "3d" or "<1h". */
  short: string;
  /** The number alone, for a large display: "5", "3" or "<1". */
  value: string;
  /** Its unit, agreeing with the number: "hours", "day". */
  unit: string;
  /** For a screen reader: "3 days", "under 1 hour". */
  spoken: string;
}

export interface DeskRequest {
  id: string;
  trackingNumber: string;
  applicantName: string;
  serviceName: string;
  status: RequestStatus;
  stage: WorkflowStage;
  wait: DeskWait;
  /** Coloured only while the move is the staff's, as in the queue. */
  tone: WaitTone;
}

export interface DeskStage {
  stage: WorkflowStage;
  label: string;
  /** Open requests in this stage, whoever holds them. */
  count: number;
  /** Of those, how many have waited on staff past the queue's critical wait. */
  longWaits: number;
  /** The longest wait on staff in this stage, or null if none is. */
  oldest: DeskWait | null;
}

/** Requests held up outside the desk: with the applicant, or at the cashier. */
export interface HeldRequests {
  total: number;
  /** The one that has waited longest. */
  oldest: DeskRequest | null;
}

export interface StaffDesk {
  openTotal: number;
  /** Every request whose next move is the staff's. */
  yoursTotal: number;
  /** The staff's requests, longest wait first. Only the first few are listed. */
  yours: DeskRequest[];
  stages: DeskStage[];
  applicant: HeldRequests;
  cashier: HeldRequests;
}

/** How many of the staff's requests the dashboard names. */
export const DESK_LIST_LIMIT = 5;

const WAIT_UNITS = { d: ["day", "days"], h: ["hour", "hours"] } as const;

export function describeWait(updatedAt: string, now: number): DeskWait {
  const short = formatTimeInStage(updatedAt, now);
  const unit = short.endsWith("d") ? "d" : "h";
  const value = short.slice(0, -1);
  const [one, many] = WAIT_UNITS[unit];
  const singular = value === "1" || value.startsWith("<");
  return {
    short,
    value,
    unit: singular ? one : many,
    spoken: value.startsWith("<") ? `under 1 ${one}` : `${value} ${singular ? one : many}`,
  };
}

function toDeskRequest(
  row: DeskSourceRow,
  status: RequestStatus,
  now: number,
): DeskRequest {
  return {
    id: row.id,
    trackingNumber: row.trackingNumber,
    applicantName: row.applicantName,
    serviceName: row.serviceName,
    status,
    stage: STAGE_OF[status],
    wait: describeWait(row.updatedAt, now),
    tone: waitTone(row, now),
  };
}

/**
 * What one desk sees: where the open requests sit, which of them are the
 * staff's move and how long each has waited, and the two holds the staff can
 * do nothing about. "Whose move" is the queue's own `requestTurn`, so the list
 * here is the queue's Needs you filter, longest wait first.
 *
 * Rejected and released requests are finished and left out.
 */
export function summarizeStaffDesk(
  rows: ReadonlyArray<DeskSourceRow>,
  now: number,
): StaffDesk {
  const stages = STAGES.map<DeskStage>((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: 0,
    longWaits: 0,
    oldest: null,
  }));
  const yours: Array<{ request: DeskRequest; updatedMs: number }> = [];
  const applicant: HeldRequests = { total: 0, oldest: null };
  const cashier: HeldRequests = { total: 0, oldest: null };
  const oldestMs: Array<number | null> = stages.map(() => null);
  let openTotal = 0;

  // Each hold keeps the request that has waited longest.
  const holdOldestMs = { applicant: Infinity, cashier: Infinity };
  const hold = (
    held: HeldRequests,
    key: keyof typeof holdOldestMs,
    request: DeskRequest,
    updatedMs: number,
  ) => {
    held.total += 1;
    if (updatedMs < holdOldestMs[key]) {
      holdOldestMs[key] = updatedMs;
      held.oldest = request;
    }
  };

  for (const row of rows) {
    if (!isRequestStatus(row.status)) continue;
    const turn = requestTurn(row);
    if (turn === "none") continue;

    const request = toDeskRequest(row, row.status, now);
    const updatedMs = Date.parse(row.updatedAt);
    const index = request.stage - 1;
    stages[index].count += 1;
    openTotal += 1;

    if (turn === "staff") {
      yours.push({ request, updatedMs });
      if (now - updatedMs >= WAIT_CRITICAL_MS) stages[index].longWaits += 1;
      const current = oldestMs[index];
      if (current === null || updatedMs < current) {
        oldestMs[index] = updatedMs;
        stages[index].oldest = request.wait;
      }
    } else if (turn === "applicant") {
      hold(applicant, "applicant", request, updatedMs);
    } else {
      hold(cashier, "cashier", request, updatedMs);
    }
  }

  yours.sort((a, b) => a.updatedMs - b.updatedMs);

  return {
    openTotal,
    yoursTotal: yours.length,
    yours: yours.slice(0, DESK_LIST_LIMIT).map(({ request }) => request),
    stages,
    applicant,
    cashier,
  };
}
