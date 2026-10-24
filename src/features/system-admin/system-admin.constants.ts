import type { AccountStatus, Role } from "~/lib/permissions";
import type { AccountCategory } from "./system-admin.types";

export const accountCategories = [
  "personnel",
  "citizens",
  "platform-admins",
] as const satisfies readonly AccountCategory[];

export const accountStatusLabels: Record<AccountStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  deactivated: "Deactivated",
};

export const accountPageSizes = [10, 20, 50] as const;
export const defaultAccountPageSize = 20;

export const accountCategoryRoles: Record<AccountCategory, Role[]> = {
  personnel: ["staff", "supervisor", "cashier", "admin"],
  citizens: ["applicant"],
  "platform-admins": ["system_admin"],
};

export const accountCategoryLabels: Record<AccountCategory, string> = {
  personnel: "CCRO Personnel",
  citizens: "Citizens",
  "platform-admins": "Platform Administrators",
};

export const roleLabels: Record<Role, string> = {
  applicant: "Applicant",
  staff: "Staff",
  supervisor: "Supervisor",
  cashier: "Cashier",
  admin: "CCRO Administrator",
  system_admin: "System Administrator",
};
