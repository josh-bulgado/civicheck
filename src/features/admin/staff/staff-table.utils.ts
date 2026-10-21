import type { Role } from "~/lib/permissions";
import type { EmploymentType, StaffMember } from "./staff.types";

export const ROLE_FILTERS = [
  "all",
  "admin",
  "supervisor",
  "staff",
  "cashier",
] as const;
export type RoleFilter = (typeof ROLE_FILTERS)[number];
export type RoleCounts = Record<RoleFilter, number>;

export const STATUS_FILTERS = [
  "all",
  "active",
  "invited",
  "deactivated",
] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const ROLE_LABELS: Partial<Record<Role, string>> = {
  admin: "Administrator",
  staff: "Staff",
  supervisor: "Supervisor",
  cashier: "Cashier",
};

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  regular: "Regular",
  job_order: "Job Order",
  contractual: "Contractual",
};

const DEPARTMENT_FALLBACK_BY_ROLE: Partial<Record<Role, string>> = {
  admin: "All departments",
  cashier: "Not applicable",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

/** Department as the table shows it: some roles never belong to one. */
export function departmentLabel(staffMember: StaffMember): string {
  return (
    DEPARTMENT_FALLBACK_BY_ROLE[staffMember.role] ??
    staffMember.departmentName ??
    "Unassigned"
  );
}

/**
 * Where an account stands. The three keys never overlap, so they can back a
 * single filter: a deactivated account stays "deactivated" even if its
 * invitation was never accepted.
 */
export function staffStatus(staffMember: StaffMember): {
  key: Exclude<StatusFilter, "all">;
  label: string;
} {
  if (staffMember.status !== "active") {
    return { key: "deactivated", label: "Deactivated" };
  }
  if (staffMember.confirmed) return { key: "active", label: "Active" };
  return {
    key: "invited",
    label: staffMember.emailConfirmed ? "Setup pending" : "Invitation pending",
  };
}

/** Case-insensitive match on name, email, role, department or employment. */
export function matchesSearch(
  staffMember: StaffMember,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    `${staffMember.firstName} ${staffMember.lastName}`,
    staffMember.email,
    roleLabel(staffMember.role),
    departmentLabel(staffMember),
    EMPLOYMENT_LABELS[staffMember.employmentType],
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function matchesRole(staffMember: StaffMember, filter: RoleFilter) {
  return filter === "all" || staffMember.role === filter;
}

export function matchesStatus(
  staffMember: StaffMember,
  filter: StatusFilter,
) {
  return filter === "all" || staffStatus(staffMember).key === filter;
}

/** Counts behind the role chips: they are both the overview and the filter. */
export function countByRole(items: ReadonlyArray<{ role: Role }>): RoleCounts {
  const counts: RoleCounts = {
    all: items.length,
    admin: 0,
    supervisor: 0,
    staff: 0,
    cashier: 0,
  };
  for (const item of items) {
    if (item.role in counts) counts[item.role as RoleFilter] += 1;
  }
  return counts;
}
