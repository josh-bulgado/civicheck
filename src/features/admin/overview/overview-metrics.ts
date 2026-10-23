import { STAGES } from "~/features/requests/request-queue";
import {
  STAGE_LABELS,
  STAGE_OF,
  TERMINAL_STATUSES,
  isRequestStatus,
  type RequestStatus,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import {
  WAIT_CRITICAL_MS,
  needsStaff,
} from "~/features/requests/requests-table.utils";
import type { AccountStatus, Role } from "~/lib/permissions";
import type { ServiceClassification } from "~/features/admin/services/services.types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The most requests the "Step in" column can name. It shows only as many as
 * fit beside the journey; the queue holds the rest.
 */
export const LONGEST_WAIT_LIMIT = 8;

/** The wait, in whole days, from which the overview calls a request a long wait. */
export const LONG_WAIT_DAYS = Math.round(WAIT_CRITICAL_MS / DAY_MS);

/** "5+ days", with a no-break space so the number never parts from its unit. */
export const LONG_WAIT_LABEL = `${LONG_WAIT_DAYS}+\u00a0days`;

// ─── Requests ────────────────────────────────────────────────────────────────

/** The few columns of an open request the overview needs. No applicant data. */
export interface OpenRequestRow {
  id: string;
  trackingNumber: string;
  serviceName: string;
  status: string;
  paymentStatus: string;
  updatedAt: string;
}

export interface StageSummary {
  stage: WorkflowStage;
  label: string;
  /** Open requests in this stage. */
  count: number;
  /** Of those, how many are waiting on staff past the queue's critical wait. */
  longWaits: number;
}

export interface LongWait {
  id: string;
  trackingNumber: string;
  serviceName: string;
  status: RequestStatus;
  days: number;
}

export interface RequestOverview {
  openTotal: number;
  waitingOnStaff: number;
  /** Every request waiting on staff past the critical wait, not only the listed ones. */
  longWaitTotal: number;
  stages: StageSummary[];
  longest: LongWait[];
}

/**
 * Open requests grouped by stage, with the long waits flagged.
 *
 * A wait counts as long when it is the staff's move and has lasted as long as
 * the request queue's red "In stage" figure (`WAIT_CRITICAL_MS`), so a request
 * the overview calls long is the same one the queue shows in red. Rejected and
 * released requests are finished, and the overview leaves them out.
 */
export function summarizeOpenRequests(
  rows: ReadonlyArray<OpenRequestRow>,
  now: number,
): RequestOverview {
  const stages = STAGES.map<StageSummary>((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: 0,
    longWaits: 0,
  }));
  const stageAt = (stage: WorkflowStage) => stages[stage - 1];
  const longWaits: Array<LongWait & { updatedMs: number }> = [];
  let openTotal = 0;
  let waitingOnStaff = 0;

  for (const row of rows) {
    if (!isRequestStatus(row.status)) continue;
    if (TERMINAL_STATUSES.includes(row.status)) continue;

    const summary = stageAt(STAGE_OF[row.status]);
    summary.count += 1;
    openTotal += 1;

    if (!needsStaff(row)) continue;
    waitingOnStaff += 1;

    const updatedMs = Date.parse(row.updatedAt);
    const elapsed = now - updatedMs;
    if (elapsed < WAIT_CRITICAL_MS) continue;

    summary.longWaits += 1;
    longWaits.push({
      id: row.id,
      trackingNumber: row.trackingNumber,
      serviceName: row.serviceName,
      status: row.status,
      days: Math.floor(elapsed / DAY_MS),
      updatedMs,
    });
  }

  longWaits.sort((a, b) => a.updatedMs - b.updatedMs);

  return {
    openTotal,
    waitingOnStaff,
    longWaitTotal: longWaits.length,
    stages,
    longest: longWaits
      .slice(0, LONGEST_WAIT_LIMIT)
      .map(({ updatedMs: _updatedMs, ...wait }) => wait),
  };
}

// ─── Journey bubbles ─────────────────────────────────────────────────────────

/** Radius, in drawing units, of an empty stage's bubble and of the fullest one's. */
export const BUBBLE_MIN_RADIUS = 26;
export const BUBBLE_MAX_RADIUS = 92;

/**
 * A stage's bubble radius, sized against the fullest stage. Area follows the
 * count, so a stage with a quarter of the busiest stage's requests has half
 * its width. It depends on proportions only, so an office with thousands of
 * open requests draws the same picture as one with a few dozen, and the
 * smallest bubble stays big enough to hold its icon.
 */
export function bubbleRadius(count: number, fullest: number): number {
  if (fullest <= 0 || count <= 0) return BUBBLE_MIN_RADIUS;
  const share = Math.min(1, count / fullest);
  return Math.round(
    BUBBLE_MIN_RADIUS +
      (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS) * Math.sqrt(share),
  );
}

// ─── Team ────────────────────────────────────────────────────────────────────

const TEAM_ROLES: readonly Role[] = ["admin", "supervisor", "staff", "cashier"];

export interface TeamSummary {
  total: number;
  /** Accepted nothing yet: the invitation is still waiting to be set up. */
  invited: number;
  /** Deactivated or suspended, so no longer able to sign in. */
  inactive: number;
}

export interface StaffAccount {
  role: Role;
  status: AccountStatus;
  /** False while an invitation has not been accepted. */
  confirmed: boolean;
}

export function summarizeTeam(accounts: ReadonlyArray<StaffAccount>): TeamSummary {
  const team: TeamSummary = { total: 0, invited: 0, inactive: 0 };

  for (const account of accounts) {
    if (!TEAM_ROLES.includes(account.role)) continue;
    team.total += 1;
    if (account.status !== "active") team.inactive += 1;
    else if (!account.confirmed) team.invited += 1;
  }

  return team;
}

// ─── Services ────────────────────────────────────────────────────────────────

export interface ServicesSummary {
  total: number;
  simple: number;
  complex: number;
  /** Highly technical and unclassified services. */
  other: number;
}

export function summarizeServices(
  classifications: ReadonlyArray<ServiceClassification | null>,
): ServicesSummary {
  let simple = 0;
  let complex = 0;
  for (const classification of classifications) {
    if (classification === "simple") simple += 1;
    else if (classification === "complex") complex += 1;
  }
  return {
    total: classifications.length,
    simple,
    complex,
    other: classifications.length - simple - complex,
  };
}
