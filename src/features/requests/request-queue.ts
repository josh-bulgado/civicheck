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

export const STAGES: WorkflowStage[] = [1, 2, 3, 4];

/** The statuses that roll up into each of the four stages. */
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

export type PaymentFilter = "unpaid" | "verified";

export const REQUEST_QUEUE_PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_REQUEST_QUEUE_PAGE_SIZE = 20;
export const REQUEST_QUEUE_SORTS = [
  "trackingNumber",
  "applicantName",
  "serviceName",
  "departmentName",
  "status",
  "handler",
  "payment",
  "createdAt",
  "inStage",
] as const;
export type RequestQueueSort = (typeof REQUEST_QUEUE_SORTS)[number];

export interface RequestQueueFilters {
  stage?: WorkflowStage;
  status?: RequestStatus;
  payment?: PaymentFilter;
  department?: string;
  /** Any request whose next workflow move belongs to staff. */
  needs?: true;
  /** Requests actively claimed by the signed-in staff member. */
  mine?: true;
  /** Requests whose staff-owned wait has crossed the attention threshold. */
  attention?: true;
  search?: string;
  page?: number;
  pageSize?: (typeof REQUEST_QUEUE_PAGE_SIZES)[number];
  sort?: RequestQueueSort;
  desc?: boolean;
}

/** Every filter cleared — navigate with this to reset the docket. */
export const EMPTY_FILTERS: RequestQueueFilters = {
  stage: undefined,
  status: undefined,
  payment: undefined,
  department: undefined,
  needs: undefined,
  mine: undefined,
  attention: undefined,
  search: undefined,
  page: undefined,
  pageSize: undefined,
  sort: undefined,
  desc: undefined,
};

/**
 * The filters after `patch`, kept consistent with each other. A status belongs
 * to one stage, so choosing a status drops the stage, and choosing a stage
 * drops a status that lives in another one. Without this the two could be set
 * to a pair that matches nothing.
 */
export function applyFilterChange(
  current: RequestQueueFilters,
  patch: Partial<RequestQueueFilters>,
): RequestQueueFilters {
  const next = { ...current, ...patch };
  if (patch.status) {
    next.stage = undefined;
  } else if (patch.attention) {
    next.needs = undefined;
    next.mine = undefined;
  } else if (patch.needs) {
    next.attention = undefined;
    next.mine = undefined;
  } else if (patch.mine) {
    next.attention = undefined;
    next.needs = undefined;
  } else if (
    "stage" in patch &&
    next.stage &&
    next.status &&
    STAGE_OF[next.status] !== next.stage
  ) {
    next.status = undefined;
  }
  return next;
}

export function parseWorkflowStage(value: unknown): WorkflowStage | undefined {
  switch (value) {
    case 1:
    case 2:
    case 3:
    case 4:
      return value;
    default:
      return undefined;
  }
}

export function parseRequestStatus(value: unknown): RequestStatus | undefined {
  return typeof value === "string" && isRequestStatus(value) ? value : undefined;
}

export function parsePaymentFilter(value: unknown): PaymentFilter | undefined {
  return value === "unpaid" || value === "verified" ? value : undefined;
}

export function parseAttentionFilter(value: unknown): true | undefined {
  return value === true || value === "true" ? true : undefined;
}

/** Backward-compatible parser for dashboard links to all staff-owned work. */
export const parseNeedsFilter = parseAttentionFilter;

export const parseMineFilter = parseAttentionFilter;

export function parseDepartmentFilter(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function parseRequestSearch(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, 100)
    : undefined;
}

export function parseRequestPage(value: unknown): number | undefined {
  const page = typeof value === "string" ? Number(value) : value;
  return typeof page === "number" &&
    Number.isInteger(page) &&
    page > 0 &&
    page <= 100_000
    ? page
    : undefined;
}

export function parseRequestPageSize(
  value: unknown,
): RequestQueueFilters["pageSize"] {
  const size = typeof value === "string" ? Number(value) : value;
  return REQUEST_QUEUE_PAGE_SIZES.includes(
    size as (typeof REQUEST_QUEUE_PAGE_SIZES)[number],
  )
    ? (size as RequestQueueFilters["pageSize"])
    : undefined;
}

export function parseRequestSort(value: unknown): RequestQueueSort | undefined {
  return REQUEST_QUEUE_SORTS.includes(value as RequestQueueSort)
    ? (value as RequestQueueSort)
    : undefined;
}

export function parseSortDirection(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
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
      return "warning" as const;
    case "under_validation":
      return "info" as const;
    case "processing":
      return "progress" as const;
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
