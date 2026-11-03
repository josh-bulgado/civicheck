import type { Role } from "~/lib/permissions";
import { EMPLOYMENT_LABELS, roleLabel } from "./staff-table.utils";
import type { EmploymentType } from "./staff.types";

/** Roles an administrator can hand out; admin accounts are never assigned here. */
export type AssignableRole = Extract<Role, "staff" | "supervisor" | "cashier">;

const ASSIGNABLE_ROLES: AssignableRole[] = ["staff", "supervisor", "cashier"];

// Built from the table's label maps so a name is only ever spelled once.
export const ASSIGNABLE_ROLE_OPTIONS = ASSIGNABLE_ROLES.map((value) => ({
  value,
  label: roleLabel(value),
}));

export const EMPLOYMENT_TYPE_OPTIONS = (
  Object.keys(EMPLOYMENT_LABELS) as EmploymentType[]
).map((value) => ({ value, label: EMPLOYMENT_LABELS[value] }));

/** Staff and supervisors work out of a department; cashiers do not. */
export function roleNeedsDepartment(role: string): boolean {
  return role === "staff" || role === "supervisor";
}
