import { useEffect } from "react";
import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getMyRequestDetailFn } from "~/features/requests/applicant-requests.queries";
import MyRequestDetailPage from "~/features/requests/pages/MyRequestDetailPage";
import { MyRequestDetailPageSkeleton } from "~/features/requests/pages/MyRequestDetailPageSkeleton";
import { denyAccess } from "~/lib/access";
import { markRequestNotificationsReadFn } from "~/features/notifications/notifications.mutations";
import { invalidateNotificationPreview } from "~/features/notifications/notification-preview-cache";

// The dashboard layout already loads the unread state the sidebar badge shows.
const dashboardLayout = getRouteApi("/_authed/_dashboard");

export const Route = createFileRoute("/_authed/_dashboard/my-requests/$requestId")({
  beforeLoad: ({ context, location }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_own"))
      denyAccess(location);
  },
  loader: ({ params }) => getMyRequestDetailFn({ data: { requestId: params.requestId } }),
  staleTime: 30_000,
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: MyRequestDetailPageSkeleton,
  component: MyRequestDetailRoute,
});

function MyRequestDetailRoute() {
  const request = Route.useLoaderData();
  const router = useRouter();
  const { unreadRequestIds } = dashboardLayout.useLoaderData();
  const hasUnread = unreadRequestIds.includes(request.id);

  // Opening a request is reading it: its unread updates clear, which takes the
  // "New" marker off the list and the count off the badge and the bell.
  useEffect(() => {
    if (!hasUnread) return;
    void markRequestNotificationsReadFn({ data: { requestId: request.id } })
      .then((result) => {
        if (result.error) return;
        invalidateNotificationPreview();
        void router.invalidate({
          filter: (match) => match.routeId === "/_authed/_dashboard",
        });
      })
      .catch(() => {});
    // `router` is stable for the app's life, so listing it does not re-run
    // this; the request and its unread state are what do.
  }, [request.id, hasUnread, router]);

  useRealtimeRefresh({
    tables: ["requests", "application_logs", "requirements_attachments", "request_messages"],
  });

  return <MyRequestDetailPage request={request} onUpdated={() => router.invalidate()} />;
}
