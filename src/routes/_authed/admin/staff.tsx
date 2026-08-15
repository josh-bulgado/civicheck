import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStaff } from "~/features/admin/staff/staff.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";
import StaffPage from "~/features/admin/staff/pages/StaffPage";

export const Route = createFileRoute("/_authed/admin/staff")({
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "users:manage")
    )
      throw redirect({ to: "/dashboard" });
  },
  loader: () => getStaff(),
  component: AdminStaffRoute,
});

function AdminStaffRoute() {
  const data = Route.useLoaderData();
  return <StaffPage staff={data.staff} departments={data.departments} />;
}
