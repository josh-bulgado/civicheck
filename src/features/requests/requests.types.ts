import type { Permission, Role } from "~/lib/permissions";

export const REQUEST_STATUSES = [
  "pending_frontdesk", "under_validation", "incomplete", "rejected",
  "processing", "pending_approval", "ready_for_release", "released",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequirementReviewStatus = "pending" | "accepted" | "missing" | "not_applicable";

export type RequestSearch = {
  q: string;
  status: string;
  payment: string;
  department: string;
  service: string;
  source: string;
  archived: boolean;
  page: number;
  sort: "oldest" | "newest";
};

export type RequestQueueItem = {
  id: string;
  trackingNumber: string;
  serviceCode: string;
  serviceName: string;
  departmentId: string | null;
  departmentName: string;
  requesterName: string;
  subjectName: string;
  status: RequestStatus;
  paymentStatus: string;
  source: string;
  submittedAt: string;
  archivedAt: string | null;
};

export type RequestQueueData = {
  items: RequestQueueItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: { departments: Array<{ id: string; name: string }>; services: Array<{ code: string; name: string }> };
  role: Role;
  permissions: Permission[];
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending_frontdesk: "Pending review",
  under_validation: "Under validation",
  incomplete: "Incomplete",
  rejected: "Rejected",
  processing: "Processing",
  pending_approval: "Pending approval",
  ready_for_release: "Ready for release",
  released: "Released",
};

export const TRANSITIONS: Record<RequestStatus, Array<{ status: RequestStatus; label: string; reason: boolean }>> = {
  pending_frontdesk: [{ status: "under_validation", label: "Begin validation", reason: false }],
  under_validation: [
    { status: "processing", label: "Send to processing", reason: false },
    { status: "incomplete", label: "Mark incomplete", reason: true },
    { status: "rejected", label: "Reject", reason: true },
  ],
  incomplete: [
    { status: "under_validation", label: "Resume validation", reason: false },
    { status: "rejected", label: "Reject", reason: true },
  ],
  processing: [
    { status: "pending_approval", label: "Submit for approval", reason: false },
    { status: "under_validation", label: "Return to validation", reason: true },
  ],
  pending_approval: [
    { status: "ready_for_release", label: "Approve for release", reason: false },
    { status: "processing", label: "Return to processing", reason: true },
  ],
  ready_for_release: [
    { status: "released", label: "Mark released", reason: false },
    { status: "processing", label: "Return to processing", reason: true },
  ],
  released: [], rejected: [],
};

export function subjectFromFormData(value: unknown) {
  if (!value || typeof value !== "object") return "Not provided";
  const data = value as Record<string, unknown>;
  const direct = data.subject_name ?? data.full_name ?? data.child_name ?? data.deceased_name ?? data.document_owner;
  if (direct) return String(direct);
  const composed = [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(" ");
  return composed || "Not provided";
}
