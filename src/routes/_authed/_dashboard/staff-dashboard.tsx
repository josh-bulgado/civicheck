import { createFileRoute, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  getAllRequestsFn,
  getAwaitingPaymentCountFn,
  getMyDepartmentScopeFn,
  getPaymentsVerifiedTodayCountFn,
} from "~/features/requests/requests.queries";
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
    // Cashier holds no request-docket permissions — it must
    // never call those functions, only the narrow counts
    // its own Cashier Counter / Payment History actually need.
    if (context.user?.role === "cashier") {
      const [scope, unpaid, paymentsVerifiedToday] = await Promise.all([
        getMyDepartmentScopeFn(),
        getAwaitingPaymentCountFn(),
        getPaymentsVerifiedTodayCountFn(),
      ]);

      return { isCashier: true as const, unpaid, paymentsVerifiedToday, scope };
    }

    const role = context.user!.role as Role;
    const canViewRequests = hasPermission(role, "requests:view_all");
    const canEncodeWalkIn = hasPermission(role, "requests:encode_walkin");
    const [requests, scope, encodableServices] = await Promise.all([
      canViewRequests ? getAllRequestsFn() : Promise.resolve([]),
      getMyDepartmentScopeFn(),
      canEncodeWalkIn ? getEncodableServicesFn() : Promise.resolve([]),
    ]);

    return {
      isCashier: false as const,
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
