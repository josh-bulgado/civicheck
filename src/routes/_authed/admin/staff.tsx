import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStaff } from "~/features/admin/staff/staff.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";
import StaffPage from "~/features/admin/staff/pages/StaffPage";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/admin/staff")({
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "users:invite_staff")
    )
      throw redirect({ to: "/dashboard" });
  },
  loader: () => getStaff(),
  component: AdminStaffRoute,
});

function AdminStaffRoute() {
  const data = Route.useLoaderData();
  // Keeps this directory in step with the System Administrator's account page —
  // both read profiles, and either can change a role or suspend an account.
  useRealtimeRefresh({ tables: ["profiles"] });
  return <StaffPage staff={data.staff} departments={data.departments} />;
}
