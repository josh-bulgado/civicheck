import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { getActiveDepartments } from "~/features/admin/departments.queries";
import { getAllRequestsFn, getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import {
  parseDepartmentFilter,
  parsePaymentFilter,
  parseRequestStatus,
  parseWorkflowStage,
  type RequestQueueFilters,
} from "~/features/requests/request-queue";
import RequestsPage from "~/features/requests/pages/RequestsPage";

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
  loader: async () => {
    const [requests, departments, scope] = await Promise.all([
      getAllRequestsFn(),
      getActiveDepartments(),
      getMyDepartmentScopeFn(),
    ]);
    return { requests, departments, scope };
  },
  component: RequestQueueRoute,
});

function RequestQueueRoute() {
  const { requests, departments, scope } = Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/requests/" });

  return (
    <RequestsPage
      requests={requests}
      departments={departments}
      filters={filters}
      onFiltersChange={(next) => navigate({ search: next })}
      scopedDepartmentName={scope.isScoped ? scope.departmentName : null}
    />
  );
}
