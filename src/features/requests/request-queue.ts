/**
 * Presentation helpers for the staff-facing request docket.
 *
 * `request-workflow.ts` owns the workflow *rules* (which statuses exist, which
 * transitions are legal). This module owns how that workflow is displayed and
 * filtered in the docket — stage groupings, search-param parsing, badge variants.
 */

import {
  REQUEST_STATUSES,
  STAGE_OF,
  isRequestStatus,
  type RequestStatus,
  type WorkflowStage,
} from "./request-workflow";

export const STAGES: WorkflowStage[] = [1, 2, 3, 4, 5];

/** The statuses that roll up into each of the five stages. */
export const STAGE_STATUSES = STAGES.reduce<Record<WorkflowStage, string[]>>(
  (acc, stage) => {
    acc[stage] = REQUEST_STATUSES.filter((status) => STAGE_OF[status] === stage);
    return acc;
  },
  {} as Record<WorkflowStage, string[]>,
);

export function isInStage(status: string, stage: WorkflowStage) {
  return STAGE_STATUSES[stage].includes(status);
}

// ─── Search params ───────────────────────────────────────────────────────────

/** Department filter value meaning "services with no department assigned". */
export const UNASSIGNED_DEPARTMENT_FILTER = "unassigned";

export interface RequestQueueFilters {
  stage?: WorkflowStage;
  status?: RequestStatus;
  payment?: "unpaid";
  department?: string;
}

/** Every filter cleared — navigate with this to reset the docket. */
export const EMPTY_FILTERS: RequestQueueFilters = {
  stage: undefined,
  status: undefined,
  payment: undefined,
  department: undefined,
};

export function parseWorkflowStage(value: unknown): WorkflowStage | undefined {
  switch (value) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      return value;
    default:
      return undefined;
  }
}

export function parseRequestStatus(value: unknown): RequestStatus | undefined {
  return typeof value === "string" && isRequestStatus(value) ? value : undefined;
}

export function parsePaymentFilter(value: unknown): "unpaid" | undefined {
  return value === "unpaid" ? value : undefined;
}

export function parseDepartmentFilter(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatRequestDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getStatusBadgeVariant(status: string | null) {
  switch (status) {
    case "submitted":
    case "incomplete":
    case "pending_approval":
      return "warning" as const;
    case "under_validation":
    case "processing":
      return "info" as const;
    case "rejected":
      return "destructive" as const;
    case "ready_for_release":
    case "released":
      return "success" as const;
    default:
      return "neutral" as const;
  }
}

export function getPaymentBadgeVariant(paymentStatus: string | null) {
  switch (paymentStatus) {
    case "unpaid":
      return "destructive" as const;
    case "verified":
      return "success" as const;
    default:
      return "neutral" as const;
  }
}
