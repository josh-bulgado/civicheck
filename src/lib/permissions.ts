export type Role =
  | "applicant"
  | "frontdesk"
  | "staff"
  | "supervisor"
  | "cashier"
  | "admin"
  | "system_admin";

export type AccountStatus = "active" | "suspended" | "deactivated";

export type Permission =
  // services
  | "services:view"
  | "services:manage"

  // requests
  | "requests:view_own"
  | "requests:view_all"
  | "requests:create"
  | "requests:process"
  | "requests:archive"
  | "requests:legal"
  | "requests:collect_payment"
  | "requests:encode_walkin"

  // counter queue
  | "queue:view_own"
  | "queue:manage"

  // CCRO personnel administration
  | "users:invite_staff"
  | "users:update_operational_roles"
  | "users:deactivate_staff"

  // platform account administration
  | "accounts:view_all"
  | "accounts:suspend"
  | "accounts:replace_admin"
  | "audit:view"
  | "health:view"
  | "security:view"
  | "security:manage"

  // dashboard
  | "dashboard:applicant"
  | "dashboard:staff"
  | "dashboard:admin"
  | "dashboard:system_admin";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  applicant: [
    "services:view",
    "requests:view_own",
    "requests:create",
    "queue:view_own",
    "dashboard:applicant",
  ],
  frontdesk: [
    // Front desk owns intake: it encodes walk-ins and runs the counter queue,
    // but does not process or approve requests.
    "requests:view_all",
    "requests:create",
    "requests:encode_walkin",
    "queue:manage",
    "dashboard:staff",
  ],
  staff: [
    "requests:view_all",
    "requests:process",
    "queue:manage",
    "dashboard:staff",
  ],
  supervisor: [
    "requests:view_all",
    "requests:process",
    "queue:manage",
    "dashboard:staff",
  ],
  cashier: [
    "requests:view_all",
    "requests:collect_payment",
    "queue:manage",
    "dashboard:staff",
  ],
  admin: [
    "services:view",
    "services:manage",
    "requests:view_all",
    "requests:process",
    "requests:archive",
    "requests:legal",
    "requests:collect_payment",
    "requests:encode_walkin",
    "queue:manage",
    "users:invite_staff",
    "users:update_operational_roles",
    "users:deactivate_staff",
    "dashboard:admin",
  ],
  system_admin: [
    "accounts:view_all",
    "accounts:suspend",
    "accounts:replace_admin",
    "audit:view",
    "health:view",
    "security:view",
    "security:manage",
    "dashboard:system_admin",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Checks if the role is any internal (non-applicant) role */
export function isInternalRole(role: Role): boolean {
  return role !== "applicant";
}

/**
 * Roles restricted to their own assigned department's requests. Everyone else
 * (frontdesk, cashier, admin, system_admin) needs cross-department visibility
 * to do their job — frontdesk triages before a request is routed to a
 * department, cashier collects payment across all services, admin/system_admin
 * oversee the whole office.
 */
export const DEPARTMENT_SCOPED_ROLES: readonly Role[] = ["staff", "supervisor"];

export function isDepartmentScopedRole(role: Role): boolean {
  return DEPARTMENT_SCOPED_ROLES.includes(role);
}
