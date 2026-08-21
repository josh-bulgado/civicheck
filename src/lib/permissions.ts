export type Role =
  | "applicant"
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
  | "requests:approve_release"
  | "requests:reverse_verification"
  | "requests:archive"
  | "requests:legal"
  | "requests:collect_payment"
  | "requests:encode_walkin"

  // CCRO personnel administration
  | "users:invite_staff"
  | "users:update_operational_roles"
  | "users:deactivate_staff"

  // platform account administration
  | "accounts:view_all"
  | "accounts:suspend"
  | "accounts:edit_details"
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
    "dashboard:applicant",
  ],
  staff: [
    "services:view",
    "requests:view_all",
    "requests:create",
    "requests:process",
    "requests:encode_walkin",
    "dashboard:staff",
  ],
  supervisor: [
    "services:view",
    "requests:view_all",
    "requests:create",
    "requests:process",
    "requests:approve_release",
    "requests:reverse_verification",
    "requests:encode_walkin",
    "dashboard:staff",
  ],
  cashier: ["requests:collect_payment", "dashboard:staff"],
  admin: [
    "services:view",
    "services:manage",
    "requests:view_all",
    "requests:process",
    "requests:approve_release",
    "requests:reverse_verification",
    "requests:archive",
    "requests:legal",
    "requests:collect_payment",
    "requests:encode_walkin",
    "users:invite_staff",
    "users:update_operational_roles",
    "users:deactivate_staff",
    "dashboard:admin",
  ],
  system_admin: [
    "accounts:view_all",
    "accounts:suspend",
    "accounts:edit_details",
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
 * Roles restricted to their own assigned department's requests. Cashier and
 * admin remain office-wide for their dedicated duties.
 */
export const DEPARTMENT_SCOPED_ROLES: readonly Role[] = ["staff", "supervisor"];

export function isDepartmentScopedRole(role: Role): boolean {
  return DEPARTMENT_SCOPED_ROLES.includes(role);
}
