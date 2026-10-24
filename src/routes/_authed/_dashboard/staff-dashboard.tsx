import { createFileRoute, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { getAllRequestsFn, getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import { getEncodableServicesFn } from "~/features/requests/walk-in-intake.queries";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { StaffDashboard } from "~/features/dashboard/StaffDashboard";
import { summarizeStaffDesk } from "~/features/dashboard/staff-desk";
import { StaffDashboardSkeleton } from "~/features/dashboard/StaffDashboardSkeleton";
import { denyAccess } from "~/lib/access";
import { toDateKey } from "~/lib/date";

export const Route = createFileRoute("/_authed/_dashboard/staff-dashboard")({
  beforeLoad: ({ context, location }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "dashboard:staff"))
      denyAccess(location);
  },
  loader: async ({ context }) => {
    const role = context.user!.role as Role;
    const canViewRequests = hasPermission(role, "requests:view_all");
    const canEncodeWalkIn = hasPermission(role, "requests:encode_walkin");
    const [requests, scope, encodableServices] = await Promise.all([
      canViewRequests ? getAllRequestsFn() : Promise.resolve([]),
      getMyDepartmentScopeFn(),
      canEncodeWalkIn ? getEncodableServicesFn() : Promise.resolve([]),
    ]);

    return {
      canEncodeWalkIn,
      scope,
      desk: canViewRequests ? summarizeStaffDesk(requests, Date.now()) : null,
      encodableServices,
      officeDate: toDateKey(),
    };
  },
  staleTime: 15_000,
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: StaffDashboardSkeleton,
  component: StaffDashboardRoute,
});

function StaffDashboardRoute() {
  const stats = Route.useLoaderData();
  const router = useRouter();
  useRealtimeRefresh({ tables: ["requests", "application_logs"] });

  return <StaffDashboard stats={stats} onChanged={() => router.invalidate()} />;
}
