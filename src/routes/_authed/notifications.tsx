import { createFileRoute, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getMyNotificationsFn } from "~/features/notifications/notifications.queries";
import NotificationsPage from "~/features/notifications/pages/NotificationsPage";

export const Route = createFileRoute("/_authed/notifications")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_own"))
      throw new Error("Forbidden");
  },
  loader: () => getMyNotificationsFn(),
  staleTime: 30_000,
  component: NotificationsRoute,
});

function NotificationsRoute() {
  const notifications = Route.useLoaderData();
  const router = useRouter();
  useRealtimeRefresh({ tables: ["notifications"] });

  return <NotificationsPage notifications={notifications} onUpdated={() => router.invalidate()} />;
}
