import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import {
  getMyNotificationsFn,
  NOTIFICATIONS_PAGE_SIZE,
} from "~/features/notifications/notifications.queries";
import NotificationsPage from "~/features/notifications/pages/NotificationsPage";

export const Route = createFileRoute("/_authed/_dashboard/notifications")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_own"))
      throw new Error("Forbidden");
  },
  // "Load more" raises `limit` in the URL rather than appending to local state,
  // so realtime refreshes and back/forward navigation stay consistent.
  validateSearch: (search: Record<string, unknown>): { limit?: number } => {
    const limit = Number(search.limit);
    return Number.isFinite(limit) && limit > NOTIFICATIONS_PAGE_SIZE ? { limit } : {};
  },
  loaderDeps: ({ search }) => ({ limit: search.limit ?? NOTIFICATIONS_PAGE_SIZE }),
  loader: ({ deps }) => getMyNotificationsFn({ data: { limit: deps.limit } }),
  staleTime: 30_000,
  component: NotificationsRoute,
});

function NotificationsRoute() {
  const { items, hasMore } = Route.useLoaderData();
  const { limit = NOTIFICATIONS_PAGE_SIZE } = Route.useSearch();
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });
  useRealtimeRefresh({ tables: ["notifications"] });

  return (
    <NotificationsPage
      notifications={items}
      hasMore={hasMore}
      onLoadMore={() =>
        navigate({
          search: { limit: limit + NOTIFICATIONS_PAGE_SIZE },
          resetScroll: false,
        })
      }
      onUpdated={() => router.invalidate()}
    />
  );
}
