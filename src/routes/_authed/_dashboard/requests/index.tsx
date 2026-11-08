import { useCallback, useEffect } from "react";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { getActiveDepartments } from "~/features/admin/departments.queries";
import {
  getRequestQueuePageFn,
  getMyDepartmentScopeFn,
} from "~/features/requests/requests.queries";
import { getEncodableServicesFn } from "~/features/requests/walk-in-intake.queries";
import {
  primeRequestQueueMetadata,
  readRequestQueueMetadata,
  requestQueueMetadataKey,
} from "~/features/requests/request-queue-metadata.cache";
import {
  parseDepartmentFilter,
  parseAttentionFilter,
  parseMineFilter,
  parseNeedsFilter,
  parsePaymentFilter,
  parseRequestPage,
  parseRequestPageSize,
  parseRequestSearch,
  parseRequestSort,
  parseRequestStatus,
  parseSortDirection,
  parseWorkflowStage,
  DEFAULT_REQUEST_QUEUE_PAGE_SIZE,
  type RequestQueueFilters,
} from "~/features/requests/request-queue";
import RequestsPage from "~/features/requests/pages/RequestsPage";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/requests/")({
  validateSearch: (search: Record<string, unknown>): RequestQueueFilters => ({
    stage: parseWorkflowStage(search.stage),
    status: parseRequestStatus(search.status),
    payment: parsePaymentFilter(search.payment),
    department: parseDepartmentFilter(search.department),
    needs: parseNeedsFilter(search.needs),
    mine: parseMineFilter(search.mine),
    attention: parseAttentionFilter(search.attention),
    search: parseRequestSearch(search.search),
    page: parseRequestPage(search.page),
    pageSize: parseRequestPageSize(search.pageSize),
    sort: parseRequestSort(search.sort),
    desc: parseSortDirection(search.desc),
  }),
  loaderDeps: ({ search }) => ({
    stage: search.stage,
    status: search.status,
    payment: search.payment,
    department: search.department,
    needs: search.needs,
    mine: search.mine,
    attention: search.attention,
    search: search.search,
    page: search.page,
    pageSize: search.pageSize,
    sort: search.sort,
    desc: search.desc,
  }),
  beforeLoad: ({ context, location }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "requests:view_all")
    )
      denyAccess(location);
  },
  loader: async ({ context, deps }) => {
    const role = context.user!.role as Role;
    const canEncode = hasPermission(role, "requests:encode_walkin");
    const metadataKey = requestQueueMetadataKey(
      context.user!.id,
      role,
      canEncode,
    );

    const [queue, metadata] = await Promise.all([
      getRequestQueuePageFn({
        data: {
          ...deps,
          page: deps.page ?? 0,
          pageSize: deps.pageSize ?? DEFAULT_REQUEST_QUEUE_PAGE_SIZE,
          sort: deps.sort ?? "inStage",
          desc: deps.sort ? (deps.desc ?? false) : true,
        },
      }),
      readRequestQueueMetadata(metadataKey, async () => {
        const [departments, scope, services] = await Promise.all([
          getActiveDepartments(),
          getMyDepartmentScopeFn(),
          canEncode ? getEncodableServicesFn() : Promise.resolve([]),
        ]);
        return { departments, scope, services };
      }),
    ]);

    return { queue, ...metadata, metadataKey, canEncode };
  },
  staleTime: 15_000,
  // Keep the current queue visible while filters or pagination load new rows.
  pendingMs: Infinity,
  component: RequestQueueRoute,
});

function RequestQueueRoute() {
  const { queue, departments, scope, services, metadataKey, canEncode } =
    Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/requests/" });
  const router = useRouter();
  const refreshQueue = useCallback(
    () =>
      router.invalidate({
        filter: (match) => match.routeId === Route.id,
      }),
    [router],
  );

  useEffect(() => {
    primeRequestQueueMetadata(metadataKey, { departments, scope, services });
  }, [departments, metadataKey, scope, services]);

  useRealtimeRefresh({
    tables: ["requests", "application_logs"],
    onRefresh: () => void refreshQueue(),
  });

  return (
    <div>
      <RequestsPage
        queue={queue}
        departments={departments}
        filters={filters}
        onFiltersChange={(next) => navigate({ search: next })}
        scopedDepartmentName={scope.isScoped ? scope.departmentName : null}
        encodableServices={canEncode ? services : null}
        onWalkInEncoded={() => void refreshQueue()}
      />
    </div>
  );
}
