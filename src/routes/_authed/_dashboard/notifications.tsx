import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import type { Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import {
  getMyNotificationsFn,
  NOTIFICATIONS_PAGE_SIZE,
} from "~/features/notifications/notifications.queries";
import { getNotificationAudience } from "~/features/notifications/notification-audience";
import NotificationsPage from "~/features/notifications/pages/NotificationsPage";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/notifications")({
  beforeLoad: ({ context, location }) => {
    if (!context.user || !getNotificationAudience(context.user.role as Role))
      denyAccess(location);
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
  const { user } = Route.useRouteContext();
  const { limit = NOTIFICATIONS_PAGE_SIZE } = Route.useSearch();
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });
  // beforeLoad has already denied roles without a feed.
  const audience = getNotificationAudience(user!.role as Role) ?? "applicant";
  useRealtimeRefresh({
    tables: [audience === "staff" ? "staff_notifications" : "notifications"],
  });

  return (
    <NotificationsPage
      audience={audience}
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
