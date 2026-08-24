import { Link } from "@tanstack/react-router";
import { Bell, Check, FileText } from "lucide-react";
import { staggerStyle } from "~/components/motion/stagger";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { cn } from "~/lib/utils";
import {
  markAllNotificationsReadFn,
  markNotificationReadFn,
} from "~/features/notifications/notifications.mutations";
import type { NotificationRow } from "~/features/notifications/notifications.queries";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface NotificationsPageProps {
  notifications: NotificationRow[];
  /** Called after a mutation succeeds, so the route can re-run its loader. */
  onUpdated: () => void;
}

export default function NotificationsPage({ notifications, onUpdated }: NotificationsPageProps) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkRead(notification: NotificationRow) {
    if (notification.isRead) return;
    await markNotificationReadFn({ data: { notificationId: notification.id } });
    onUpdated();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadFn();
    onUpdated();
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
              <Check data-icon="inline-start" />
              Mark all as read
            </Button>
          )}
        </div>
      </header>

      {notifications.length === 0 ? (
        <Empty className="dashboard-panel civic-enter-scale mx-auto mt-8 max-w-lg border-0 px-6 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-primary text-white shadow-md">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>Nothing yet</EmptyTitle>
            <EmptyDescription>
              You'll see updates here as soon as your requests move forward.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/my-requests"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              View my requests
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="dashboard-panel overflow-hidden">
          <div className="civic-stagger divide-y divide-border">
            {notifications.map((notification, index) => (
              <Button
                key={notification.id}
                type="button"
                variant="ghost"
                style={staggerStyle(index)}
                onClick={() => handleMarkRead(notification)}
                className={cn(
                  "h-auto w-full items-start justify-start gap-4 rounded-none p-5 text-left whitespace-normal",
                  !notification.isRead && "bg-primary-soft/40",
                )}
              >
                <div
                  className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    notification.isRead
                      ? "bg-surface-subtle text-muted-foreground"
                      : "bg-primary text-white"
                  }`}
                >
                  <FileText />
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
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
