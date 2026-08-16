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

export type HealthStatus =
  | "operational"
  | "degraded"
  | "outage"
  | "unknown";

export type HealthTrendPoint = {
  timestamp: string;
  responseTimeMs: number | null;
  status: HealthStatus;
};

export type ServiceHealth = {
  key: "database" | "authentication" | "storage";
  name: string;
  description: string;
  status: HealthStatus;
  responseTimeMs: number | null;
  availabilityPercent: number;
  errorRatePercent: number;
  lastCheckedAt: string;
  trend: HealthTrendPoint[];
};

export type OperationalSignal = {
  key: "queue" | "jobs" | "storage" | "workflow";
  label: string;
  value: string;
  detail: string;
  status: HealthStatus;
};

export type HealthEvent = {
  id: string;
  component: string;
  title: string;
  summary: string;
  type: "degradation" | "recovery" | "maintenance";
  severity: "info" | "warning" | "critical";
  timestamp: string;
  resolvedAt: string | null;
  relatedAuditEventId: string | null;
};

export type SystemHealthDashboard = {
  overallStatus: HealthStatus;
  availabilityPercent: number;
  activeDegradations: number;
  checkedAt: string;
  services: ServiceHealth[];
  signals: OperationalSignal[];
  events: HealthEvent[];
};
