import { TablePageSkeleton } from "~/components/feedback/PageSkeleton";
import { createFileRoute } from "@tanstack/react-router";
import { getStaff } from "~/features/admin/staff/staff.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";
import StaffPage from "~/features/admin/staff/pages/StaffPage";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/admin/staff")({
  beforeLoad: ({ context, location }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "users:invite_staff")
    )
      denyAccess(location);
  },
  loader: () => getStaff(),
  staleTime: 30_000,
  pendingComponent: () => <TablePageSkeleton label="Loading personnel" avatar />,
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
