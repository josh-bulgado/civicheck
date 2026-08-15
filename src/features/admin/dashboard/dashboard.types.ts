import type { Role } from "~/lib/permissions";

export type DashboardRequestStatus =
  | "pending_frontdesk"
  | "under_validation"
  | "incomplete"
  | "rejected"
  | "processing"
  | "pending_approval"
  | "ready_for_release"
  | "released"
  | string
  | null;

export type DashboardPaymentStatus = "unpaid" | "verified" | string | null;

export type DashboardRequestItem = {
  id: string;
  trackingNumber: string;
  serviceName: string;
  status: DashboardRequestStatus;
  paymentStatus: DashboardPaymentStatus;
  submittedAt: string;
  feeDue: number;
};

export type DashboardAttentionItem = DashboardRequestItem & {
  reason: string;
};

export type AdminDashboardData = {
  generatedAt: string;
  counts: {
    active: number;
    pendingReview: number;
    incomplete: number;
    pendingApproval: number;
    readyForRelease: number;
    unpaid: number;
  };
  pipeline: {
    intake: number;
    validation: number;
    processing: number;
    approval: number;
    release: number;
  };
  attentionItems: DashboardAttentionItem[];
  recentRequests: DashboardRequestItem[];
  serviceDemand: Array<{
    serviceName: string;
    count: number;
  }>;
  personnel: {
    total: number;
    byRole: Array<{
      role: Extract<Role, "frontdesk" | "staff" | "supervisor" | "cashier" | "admin">;
      label: string;
      count: number;
    }>;
    byDepartment: Array<{
      departmentName: string;
      count: number;
    }>;
  };
};
