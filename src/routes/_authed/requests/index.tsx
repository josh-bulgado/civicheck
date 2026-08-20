import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { getActiveDepartments } from "~/features/admin/departments.queries";
import { getAllRequestsFn, getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import { getEncodableServicesFn } from "~/features/requests/walk-in-intake.queries";
import {
  parseDepartmentFilter,
  parsePaymentFilter,
  parseRequestStatus,
  parseWorkflowStage,
  type RequestQueueFilters,
} from "~/features/requests/request-queue";
import RequestsPage from "~/features/requests/pages/RequestsPage";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/requests/")({
  validateSearch: (search: Record<string, unknown>): RequestQueueFilters => ({
    stage: parseWorkflowStage(search.stage),
    status: parseRequestStatus(search.status),
    payment: parsePaymentFilter(search.payment),
    department: parseDepartmentFilter(search.department),
  }),
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_all"))
      throw new Error("Forbidden");
  },
  loader: async ({ context }) => {
    const role = context.user!.role as Role;
    const canEncode = hasPermission(role, "requests:encode_walkin");
    const [requests, departments, scope, services] = await Promise.all([
      getAllRequestsFn(),
      getActiveDepartments(),
      getMyDepartmentScopeFn(),
      canEncode ? getEncodableServicesFn() : Promise.resolve([]),
    ]);
    return { requests, departments, scope, services, canEncode };
  },
  staleTime: 15_000,
  component: RequestQueueRoute,
});

function RequestQueueRoute() {
  const { requests, departments, scope, services, canEncode } = Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/requests/" });
  const router = useRouter();
  useRealtimeRefresh({ tables: ["requests", "application_logs"] });

  return (
    <RequestsPage
      requests={requests}
      departments={departments}
      filters={filters}
      onFiltersChange={(next) => navigate({ search: next })}
      scopedDepartmentName={scope.isScoped ? scope.departmentName : null}
      encodableServices={canEncode ? services : null}
      onWalkInEncoded={() => router.invalidate()}
    />
  );
}
