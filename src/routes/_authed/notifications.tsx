import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Bell, Check, FileText } from "lucide-react";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { Button } from "~/components/ui/button";
import { staggerStyle } from "~/components/motion/stagger";
import {
  getMyNotificationsFn,
  type NotificationRow,
} from "~/features/notifications/notifications.queries";
import {
  markAllNotificationsReadFn,
  markNotificationReadFn,
} from "~/features/notifications/notifications.mutations";

export const Route = createFileRoute("/_authed/notifications")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_own"))
      throw new Error("Forbidden");
  },
  loader: () => getMyNotificationsFn(),
  component: NotificationsPage,
});

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationsPage() {
  const notifications = Route.useLoaderData();
  const router = useRouter();
  useRealtimeRefresh({ tables: ["notifications"] });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkRead(notification: NotificationRow) {
    if (notification.isRead) return;
    await markNotificationReadFn({ data: { notificationId: notification.id } });
    router.invalidate();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadFn();
    router.invalidate();
  }

  return (
    <div className="dashboard-page max-w-4xl">
      <header className="dashboard-hero">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
              Applicant workspace
            </p>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              Notifications
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Updates on your civil registry requests, as they happen.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              className="civic-press shrink-0 bg-white text-primary hover:bg-primary-soft"
              onClick={handleMarkAllRead}
            >
              <Check className="size-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </header>

      {notifications.length === 0 ? (
        <div className="dashboard-panel civic-enter-scale mx-auto mt-8 max-w-lg space-y-4 px-6 py-16 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary text-white shadow-md">
            <Bell className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-foreground">Nothing yet</h3>
            <p className="text-sm text-muted-foreground">
              You'll see updates here as soon as your requests move forward.
            </p>
          </div>
          <Link
            to="/my-requests"
            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-white px-3.5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            View my requests
          </Link>
        </div>
      ) : (
        <div className="dashboard-panel overflow-hidden">
          <div className="civic-stagger divide-y divide-border">
            {notifications.map((notification, index) => (
              <button
                key={notification.id}
                type="button"
                style={staggerStyle(index)}
                onClick={() => handleMarkRead(notification)}
                className={`flex w-full items-start gap-4 p-5 text-left transition-colors duration-200 hover:bg-surface-subtle ${
                  notification.isRead ? "" : "bg-primary-soft/40"
                }`}
              >
                <div
                  className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    notification.isRead
                      ? "bg-surface-subtle text-muted-foreground"
                      : "bg-primary text-white"
                  }`}
                >
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm ${notification.isRead ? "font-medium text-foreground" : "font-bold text-foreground"}`}
                    >
                      {notification.subject}
                    </p>
                    {!notification.isRead && (
                      <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {notification.body}
                  </p>
                  <p className="mt-2 text-xs font-mono text-muted-foreground">
                    {notification.trackingNumber} · {formatDateTime(notification.sentAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
