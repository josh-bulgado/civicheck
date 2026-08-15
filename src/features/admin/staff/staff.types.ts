import type { Role } from "~/lib/permissions";

export type Department = {
  id: string;
  name: string;
};

export type EmploymentType = "regular" | "job_order" | "contractual";

export type StaffMember = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  invitedAt: string;
  emailConfirmed: boolean;
  confirmed: boolean;
  departmentId: string | null;
  departmentName: string;
  employmentType: EmploymentType;
};

export type InviteStaffInput = {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  departmentId?: string | null;
  employmentType: EmploymentType;
};

export type UpdateStaffAccessInput = {
  staffId: string;
  role: Extract<Role, "frontdesk" | "staff" | "supervisor" | "cashier">;
  departmentId?: string | null;
  employmentType: EmploymentType;
};

export type StaffActionResult = {
  error: boolean;
  message: string;
};
