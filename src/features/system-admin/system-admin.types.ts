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

/**
 * "never" narrows to accounts that have not signed in yet; "unverified" to
 * accounts whose email is still unconfirmed, pending invitations excluded
 * (those belong to the CCRO Administrator).
 */
export type AccountSignInFilter = "never" | "unverified";

/** Server-side directory filters, mirrored in the accounts route's search. */
export type AccountFilters = {
  q?: string;
  role?: Role;
  status?: AccountStatus;
  departmentId?: string;
  signIn?: AccountSignInFilter;
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

/** One check: ok, slow (over its limit) or failed (no answer). */
export type CheckOutcome = "ok" | "slow" | "failed";

/** Where a figure comes from. Read from the components table, never written in code. */
export type HealthSource = {
  measuredBy: string;
  updates: string;
  exposure: string;
};

export type HealthCheck = {
  at: string;
  outcome: CheckOutcome;
  responseMs: number | null;
};

export type ServiceKey = "database" | "authentication" | "storage";

export type ServiceHealth = {
  key: ServiceKey;
  name: string;
  description: string;
  status: HealthStatus;
  /** The latest check. Null before the first one. */
  outcome: CheckOutcome | null;
  responseMs: number | null;
  slowAfterMs: number;
  /** Share of the last 24 hours spent healthy, weighted by time. Null with no checks. */
  availabilityPercent: number | null;
  okCount: number;
  slowCount: number;
  failedCount: number;
  lastCheckedAt: string | null;
  /** The last 24 hours, oldest first. */
  checks: HealthCheck[];
  source: HealthSource;
};

export type StorageCapacity = {
  name: string;
  description: string;
  status: HealthStatus;
  /** False until a system administrator sets a capacity. */
  configured: boolean;
  objectCount: number | null;
  totalBytes: number | null;
  capacityBytes: number | null;
  percentUsed: number | null;
  lastCheckedAt: string | null;
  source: HealthSource;
};

export type MonitorHealth = {
  name: string;
  description: string;
  /** Unknown until the first run, degraded once a run is overdue or failed. */
  status: HealthStatus;
  lastRunAt: string | null;
  lastRunSucceeded: boolean | null;
  runs24h: number;
  succeeded24h: number;
  minutesSinceLastRun: number | null;
  source: HealthSource;
};

export type HealthEvent = {
  id: string;
  componentKey: string;
  component: string;
  title: string;
  summary: string;
  type: "degradation" | "recovery" | "maintenance";
  severity: "info" | "warning" | "critical";
  startedAt: string;
  resolvedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedByName: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  relatedAuditEventId: string | null;
};

export type HealthSettings = {
  emailAlerts: boolean;
  cooldownMinutes: number;
};

export type SecurityGlance = {
  posture: SecurityPosture;
  openFindingCount: number;
  overdueControlCount: number;
};

export type SystemHealthDashboard = {
  overallStatus: HealthStatus;
  /** Average availability of the services, by time. Null with no checks. */
  availabilityPercent: number | null;
  slowest: { name: string; responseMs: number } | null;
  /** Open incidents, plus one when the monitor itself has stopped. */
  activeCount: number;
  checkedAt: string | null;
  now: string;
  services: ServiceHealth[];
  capacity: StorageCapacity;
  monitor: MonitorHealth;
  /** Open incidents first, then the last 7 days and upcoming maintenance. */
  events: HealthEvent[];
  settings: HealthSettings;
  /** Null when Security Center could not be read, so Health still loads. */
  security: SecurityGlance | null;
  lastManualCheckAt: string | null;
  /** Whether this account may run checks and change limits. */
  canManage: boolean;
};

export type MaintenanceInput = {
  component: ServiceKey | "all";
  title: string;
  note: string;
  startsAt: string;
  endsAt: string;
};

export type HealthLimitsInput = {
  database: number;
  authentication: number;
  storage: number;
  /** Null clears the capacity, which turns the gauge back to Not Configured. */
  capacityGb: number | null;
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
