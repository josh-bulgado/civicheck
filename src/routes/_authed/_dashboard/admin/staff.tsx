import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStaff } from "~/features/admin/staff/staff.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";
import StaffPage from "~/features/admin/staff/pages/StaffPage";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/_dashboard/admin/staff")({
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "users:invite_staff")
    )
      throw redirect({ to: "/dashboard" });
  },
  loader: () => getStaff(),
  staleTime: 30_000,
  component: AdminStaffRoute,
});

function AdminStaffRoute() {
  const data = Route.useLoaderData();
  // Keeps this directory in step with the System Administrator's account page —
  // both read profiles and can suspend an account, but only this page can
  // change a staff member's role, department, or employment type.
  useRealtimeRefresh({ tables: ["profiles"] });
  return <StaffPage staff={data.staff} departments={data.departments} />;
}
