import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdminClient } from "~/utils/supabase";
import type { Role } from "~/lib/permissions";
import { requireActiveSession } from "~/server/auth";
import type { Department, EmploymentType, StaffMember } from "./staff.types";

const CCRO_ROLES: Role[] = ["frontdesk", "staff", "supervisor", "cashier", "admin"];

export const getStaff = createServerFn({ method: "GET" }).handler(async () => {
  await requireActiveSession("users:invite_staff");

  const adminSupabase = getSupabaseAdminClient();
  const [
    { data: usersData, error: usersError },
    { data: profiles, error: profilesError },
    { data: departments, error: departmentsError },
  ] = await Promise.all([
    adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
    adminSupabase
      .from("profiles")
      .select("id, first_name, last_name, role, department_id, employment_type, access_status")
      .in("role", CCRO_ROLES),
    adminSupabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);
  if (usersError) throw new Error(usersError.message);
  if (profilesError) throw new Error(profilesError.message);
  if (departmentsError) throw new Error(departmentsError.message);
  const profileById = new Map((profiles ?? []).map((item) => [item.id, item]));
  const departmentById = new Map(
    (departments ?? []).map((item) => [item.id, item]),
  );
  type AdminUser = {
    id: string;
    email?: string;
    created_at: string;
    email_confirmed_at?: string | null;
    user_metadata?: Record<string, unknown>;
  };
  const staff = ((usersData?.users ?? []) as AdminUser[])
    .map((user): StaffMember | null => {
      const item = profileById.get(user.id);
      if (!item || !CCRO_ROLES.includes(item.role as Role)) return null;
      const department = item?.department_id
        ? departmentById.get(item.department_id)
        : undefined;
      const wasInvited = Boolean(user.user_metadata?.invited_role);
      const invitationAccepted = Boolean(
        user.user_metadata?.invitation_accepted_at,
      );
      return {
        id: user.id,
        email: user.email ?? "",
        firstName:
          item?.first_name ?? String(user.user_metadata?.first_name ?? ""),
        lastName:
          item?.last_name ?? String(user.user_metadata?.last_name ?? ""),
        role: item.role as Role,
        invitedAt: user.created_at,
        emailConfirmed: Boolean(user.email_confirmed_at),
        confirmed: wasInvited
          ? invitationAccepted
          : Boolean(user.email_confirmed_at),
        departmentId: item?.department_id ?? null,
        departmentName: department?.name ?? "Unassigned",
        employmentType: (item?.employment_type ?? "regular") as EmploymentType,
        status: item.access_status ?? "active",
      };
    })
    .filter((user): user is StaffMember => user !== null);
  return { staff, departments: (departments ?? []) as Department[] };
});
