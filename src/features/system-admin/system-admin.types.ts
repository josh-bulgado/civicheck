import type { AccountStatus, Role } from "~/lib/permissions";

export type AccountCategory =
  | "personnel"
  | "citizens"
  | "platform-admins";

export type AccountSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  lastSignInAt: string | null;
  suspensionReason: string | null;
  departmentId: string | null;
};

export type AdminCandidate = Pick<
  AccountSummary,
  "id" | "firstName" | "lastName" | "role"
>;

export type SystemAdminDepartment = {
  id: string;
  name: string;
};

export type NormalizedAuditEvent = {
  id: string;
  source: "system" | "request";
  eventType: string;
  actorId: string | null;
  actor: string;
  targetId: string | null;
  requestId: string | null;
  timestamp: string;
};

export type AuditFilters = {
  page?: number;
  pageSize?: number;
  actor?: string;
  event?: string;
  source?: "all" | "system" | "request";
  from?: string;
  to?: string;
};
