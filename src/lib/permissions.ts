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

  // CCRO personnel administration
  | "users:invite_staff"
  | "users:update_operational_roles"
  | "users:deactivate_staff"

  // platform account administration
  | "accounts:view_all"
  | "accounts:suspend"
  | "accounts:replace_admin"
  | "audit:view"

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
  frontdesk: [
    // scope TBD — treated as applicant-level for now
    "services:view",
    "requests:view_own",
    "requests:create",
    "dashboard:applicant",
  ],
  staff: [
    "services:view",
    "requests:view_all",
    "requests:process",
    "dashboard:staff",
  ],
  supervisor: [
    "services:view",
    "requests:view_all",
    "requests:process",
    "dashboard:staff",
  ],
  cashier: [
    "services:view",
    "requests:view_all",
    "requests:collect_payment",
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
  return role !== "applicant" && role !== "frontdesk";
}
