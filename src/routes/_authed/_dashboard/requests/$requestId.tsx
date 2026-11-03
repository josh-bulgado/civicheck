import { createFileRoute, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getRequestDetailFn } from "~/features/requests/requests.queries";
import RequestDetailPage, {
  REQUEST_DETAIL_TABS,
  type RequestDetailTab,
} from "~/features/requests/pages/RequestDetailPage";
import { RequestDetailPageSkeleton } from "~/features/requests/pages/RequestDetailPageSkeleton";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/requests/$requestId")({
  // The open tab lives in the URL so a link or a reload lands on the same one.
  validateSearch: (search: Record<string, unknown>): { tab?: RequestDetailTab } => ({
    tab: REQUEST_DETAIL_TABS.find((tab) => tab === search.tab),
  }),
  beforeLoad: ({ context, location }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "requests:view_all")
    )
      denyAccess(location);
  },
  loader: ({ params }) =>
    getRequestDetailFn({ data: { requestId: params.requestId } }),
  staleTime: 30_000,
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: RequestDetailPageSkeleton,
  component: RequestDetailRoute,
});

function RequestDetailRoute() {
  const request = Route.useLoaderData();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  useRealtimeRefresh({
    tables: ["requests", "application_logs", "requirements_attachments", "request_messages"],
  });

  return (
    <RequestDetailPage
      request={request}
      tab={tab}
      onTabChange={(next) => navigate({ search: { tab: next }, replace: true })}
      // The queue keeps its filters in the URL, so going back lands on the same
      // view. Opened from a link, there is nothing to go back to.
      onBack={() =>
        router.history.canGoBack()
          ? router.history.back()
          : router.navigate({ to: "/requests" })
      }
      onUpdated={() => router.invalidate()}
    />
  );
}
