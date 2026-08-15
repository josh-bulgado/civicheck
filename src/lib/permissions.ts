export type Role =
  | "applicant"
  | "frontdesk"
  | "staff"
  | "supervisor"
  | "cashier"
  | "admin";

export type Permission =
  // services
  | "services:view"
  | "services:manage"

  // requests
  | "requests:view_own"
  | "requests:view_all"
  | "requests:create"
  | "requests:intake"
  | "requests:validate"
  | "requests:process"
  | "requests:approve"
  | "requests:release"
  | "requests:archive"
  | "requests:restore"
  | "requests:retry_notification"
  | "requests:legal"
  | "requests:collect_payment"

  // users
  | "users:manage"

  // dashboard
  | "dashboard:applicant"
  | "dashboard:staff"
  | "dashboard:admin";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  applicant: [
    "services:view",
    "requests:view_own",
    "requests:create",
    "dashboard:applicant",
  ],
  frontdesk: [
    "services:view",
    "requests:view_all",
    "requests:intake",
    "dashboard:staff",
  ],
  staff: [
    "services:view",
    "requests:view_all",
    "requests:intake",
    "requests:validate",
    "requests:process",
    "requests:release",
    "dashboard:staff",
  ],
  supervisor: [
    "services:view",
    "requests:view_all",
    "requests:intake",
    "requests:validate",
    "requests:process",
    "requests:approve",
    "requests:release",
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
    "requests:intake",
    "requests:validate",
    "requests:process",
    "requests:approve",
    "requests:release",
    "requests:archive",
    "requests:restore",
    "requests:retry_notification",
    "requests:legal",
    "requests:collect_payment",
    "users:manage",
    "dashboard:admin",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Checks if the role is any internal (non-applicant) role. */
export function isInternalRole(role: Role): boolean {
  return role !== "applicant";
}
