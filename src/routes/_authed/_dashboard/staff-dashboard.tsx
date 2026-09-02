import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  getAllRequestsFn,
  getAwaitingPaymentCountFn,
  getMyDepartmentScopeFn,
  getPaymentsVerifiedTodayCountFn,
  type StaffRequestRow,
} from "~/features/requests/requests.queries";
import { STAGE_OF, isRequestStatus } from "~/features/requests/request-workflow";
import { getEncodableServicesFn } from "~/features/requests/walk-in-intake.queries";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { StaffDashboard } from "~/features/dashboard/StaffDashboard";
import { StaffDashboardSkeleton } from "~/features/dashboard/StaffDashboardSkeleton";

export const Route = createFileRoute("/_authed/_dashboard/staff-dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "dashboard:staff"))
      throw redirect({ to: "/dashboard" });
  },
  loader: async ({ context }) => {
    const isCashier = context.user?.role === "cashier";

    // Cashier holds no request-docket permissions — it must
    // never call those functions, only the narrow counts
    // its own Cashier Counter / Payment History actually need.
    if (isCashier) {
      const [scope, unpaid, paymentsVerifiedToday] = await Promise.all([
        getMyDepartmentScopeFn(),
        getAwaitingPaymentCountFn(),
        getPaymentsVerifiedTodayCountFn(),
      ]);

      return {
        isCashier: true as const,
        canViewRequests: false,
        canEncodeWalkIn: false,
        awaitingIntake: 0,
        inValidation: 0,
        inProgress: 0,
        readyForRelease: 0,
        unpaid,
        paymentsVerifiedToday,
        scope,
        needsAttention: [] as StaffRequestRow[],
        needsAttentionCount: 0,
        encodableServices: [],
      };
    }

    const role = context.user!.role as Role;
    const canViewRequests = hasPermission(role, "requests:view_all");
    const canEncodeWalkIn = hasPermission(role, "requests:encode_walkin");
    const [requests, scope, encodableServices] = await Promise.all([
      canViewRequests ? getAllRequestsFn() : Promise.resolve([]),
      getMyDepartmentScopeFn(),
      canEncodeWalkIn ? getEncodableServicesFn() : Promise.resolve([]),
    ]);

    const inStage = (stage: number) =>
      requests.filter((r) => isRequestStatus(r.status) && STAGE_OF[r.status] === stage)
        .length;

    const needsAttentionAll = requests
      .filter((r) => r.status === "incomplete" || r.status === "rejected")
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

    return {
      isCashier: false as const,
      canViewRequests,
      canEncodeWalkIn,
      awaitingIntake: inStage(1),
      inValidation: inStage(2),
      // Stage 4 is Release, which the readyForRelease tile already counts —
      // rolling it in here would double-count it (and pull in released ones).
      inProgress: inStage(3),
      readyForRelease: requests.filter((r) => r.status === "ready_for_release").length,
      unpaid: requests.filter(
        (r) => r.status === "ready_for_release" && r.paymentStatus !== "verified",
      ).length,
      paymentsVerifiedToday: 0,
      scope,
      needsAttention: needsAttentionAll.slice(0, 5),
      needsAttentionCount: needsAttentionAll.length,
      encodableServices,
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
