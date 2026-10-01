import type { AccountStatus, Role } from "~/lib/permissions";

export type AccountCategory =
  | "personnel"
  | "citizens"
  | "platform-admins";

export type AccountSex = "" | "male" | "female";

export type AccountEmploymentType = "regular" | "job_order" | "contractual";

/**
 * Optional profile columns are normalised to "" (never null) so the edit
 * dialog's inputs stay controlled without per-field fallbacks.
 */
export type AccountSummary = {
  id: string;
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  sex: AccountSex;
  phoneNumber: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  lastSignInAt: string | null;
  suspensionReason: string | null;
  departmentId: string | null;
  employmentType: AccountEmploymentType;
  /** False until the owner has confirmed their email (or accepted an invite). */
  emailConfirmed: boolean;
  /**
   * Personnel invited by the CCRO Administrator who have not accepted yet.
   * Read-only here: sending and cancelling invitations stays with the CCRO
   * Administrator.
   */
  invitePending: boolean;
  /** When the pending invitation was created; null if not a pending invite. */
  invitedAt: string | null;
};

/** Server-side directory filters, mirrored in the accounts route's search. */
export type AccountFilters = {
  q?: string;
  role?: Role;
  status?: AccountStatus;
  departmentId?: string;
  /** "never" narrows to accounts that have not signed in yet. */
  signIn?: "never";
};

/** One audit event that targeted an account, shaped for the history dialog. */
export type AccountHistoryEvent = {
  id: string;
  eventType: string;
  actor: string;
  timestamp: string;
  reason: string | null;
  /** Secondary line, e.g. the device and network of a sign-in. */
  detail: string | null;
};

/** Payload of the system administrator's account edit dialog. */
export type AccountDetailsInput = {
  targetId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  sex: AccountSex;
  phoneNumber: string;
  email: string;
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
  source: "system" | "request" | "sign-in";
  eventType: string;
  actorId: string | null;
  actor: string;
  targetId: string | null;
  requestId: string | null;
  timestamp: string;
  deviceLabel: string | null;
  maskedIpAddress: string | null;
};

export type AuditFilters = {
  page?: number;
  pageSize?: number;
  actor?: string;
  event?: string;
  source?: "all" | "system" | "request" | "sign-in";
  from?: string;
  to?: string;
  /** Narrows to events performed by, or targeting, this profile id. */
  account?: string;
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
  key: "jobs" | "storage" | "workflow";
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

export type SecurityFindingSeverity = "critical" | "high" | "medium" | "low";

export type SecurityFindingStatus = "open" | "acknowledged" | "resolved";

export type SecurityFindingCategory =
  | "authentication"
  | "privileged_access"
  | "policy";

export type SecurityFinding = {
  id: string;
  category: SecurityFindingCategory;
  severity: SecurityFindingSeverity;
  title: string;
  summary: string;
  status: SecurityFindingStatus;
  subjectLabel: string | null;
  assignedToId: string | null;
  assignedToLabel: string | null;
  lastSeenAt: string;
  resolutionNote: string | null;
};

export type SecurityControlStatus =
  | "enforced"
  | "monitoring"
  | "review_due"
  | "action_required";

export type SecurityPolicyControl = {
  key: string;
  category: "identity" | "access" | "credentials" | "audit";
  name: string;
  description: string;
  status: SecurityControlStatus;
  evidenceSummary: string;
  lastReviewedAt: string | null;
  nextReviewDueAt: string | null;
  reviewIntervalDays: number;
};

export type PrivilegedAccountSecurity = {
  id: string;
  name: string;
  role: Role;
  status: AccountStatus;
  lastSignInAt: string | null;
  isStale: boolean;
};

export type SecurityActivity = {
  id: string;
  type:
    | "sign_in_failed"
    | "admin_session_started"
    | "staff_session_started"
    | "privileged_action";
  risk: SecurityFindingSeverity;
  actor: string;
  summary: string;
  timestamp: string;
};

export type SecurityAssignee = {
  id: string;
  name: string;
};

export type SecurityPosture = "protected" | "watch" | "attention";

export type SecurityCenterDashboard = {
  posture: SecurityPosture;
  checkedAt: string;
  openFindingCount: number;
  urgentFindingCount: number;
  failedSignIns24h: number;
  privilegedAccountCount: number;
  overdueControlCount: number;
  findings: SecurityFinding[];
  privilegedAccounts: PrivilegedAccountSecurity[];
  controls: SecurityPolicyControl[];
  activities: SecurityActivity[];
  assignees: SecurityAssignee[];
};
