"use client";

import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  TYPE_STYLE,
  feedDetail,
  feedTitle,
  linkFor,
  timeFormat,
} from "~/features/notifications/notification-display";
import {
  bindNotificationToasts,
  dismissNotificationToast,
  useNotificationToasts,
  type NotificationToast,
} from "~/features/notifications/new-notification-toasts";
import { updateNotificationPreview } from "~/features/notifications/notification-preview-cache";
import { updateNotificationFn } from "~/features/notifications/notifications.mutations";

interface NewNotificationToastsProps {
  /** Keys the stack, so one person's pop-ups are never shown to another. */
  userId: string;
  /** The page has a bar along the bottom on a phone (the applicant's); sit above it. */
  lifted?: boolean;
}

/**
 * The pop-up for a new notification, at the bottom right: the same row the
 * bell's feed shows for an unread update, on its own card. It stays until the
 * user dismisses it with the X or opens the notification.
 *
 * What feeds it, and what counts as an arrival, is in new-notification-toasts.
 */
export function NewNotificationToasts({ userId, lifted = false }: NewNotificationToastsProps) {
  useEffect(() => bindNotificationToasts(userId), [userId]);
  const toasts = useNotificationToasts(userId);

  return (
    // Always in the page so a screen reader hears arrivals. An empty stack lets
    // clicks through; a full stack scrolls without dropping older notifications.
    <div
      role="region"
      aria-label="New notifications"
      aria-live="polite"
      className={cn(
        "fixed inset-x-3 z-60 flex max-h-[min(28rem,calc(100dvh-2rem))] flex-col items-end gap-3 overflow-y-auto overscroll-contain p-1 md:inset-x-auto md:right-5 md:bottom-5 md:max-h-[min(28rem,calc(100dvh-3rem))]",
        toasts.length > 0 ? "pointer-events-auto" : "pointer-events-none",
        lifted
          ? "bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] max-h-[min(28rem,calc(100dvh-env(safe-area-inset-bottom)-7.5rem))] md:max-h-[min(28rem,calc(100dvh-3rem))]"
          : "bottom-3",
      )}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.key} toast={toast} userId={userId} />
      ))}
    </div>
  );
}

function ToastCard({ toast, userId }: { toast: NotificationToast; userId: string }) {
  const router = useRouter();
  const { key, notification, leaving } = toast;
  const dismiss = () => dismissNotificationToast(key);

  const { icon: TypeIcon, unreadClass } = TYPE_STYLE[notification.type] ?? TYPE_STYLE.status_change;
  // Staff alerts have no service; they name the request by its tracking number.
  const label = notification.serviceName ?? notification.trackingNumber;
  const detail = feedDetail(notification);

  function open() {
    dismiss();
    void markRead(router, userId, notification.id);
  }

  return (
    <div
      className={cn(
        "pointer-events-auto relative w-full shrink-0 md:w-96",
        leaving ? "civic-toast-out" : "civic-toast-in",
      )}
    >
      {linkFor(notification.target, open, {
        className:
          "civic-interactive flex items-start gap-3 rounded-2xl bg-card p-4 pr-12 shadow-portal-popover ring-1 ring-border-light outline-none hover:bg-[#f1f6fd] focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-primary-soft",
        children: (
          <>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                unreadClass,
              )}
              aria-hidden="true"
            >
              <TypeIcon className="size-5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-snug font-semibold text-foreground">
                {feedTitle(notification.subject)}
              </span>
              {label ? (
                <span className="mt-1 line-clamp-2 text-[13.5px] leading-snug wrap-break-word text-body-2">
                  {label}
                </span>
              ) : null}
              {detail ? (
                <span className="mt-0.5 line-clamp-2 block text-[14px] leading-[1.35] text-body-2">
                  {detail}
                </span>
              ) : null}
              <span className="mt-2 flex items-center gap-1.5 text-xs leading-snug text-muted-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <time dateTime={notification.sentAt}>
                  {timeFormat.format(new Date(notification.sentAt))}
                </time>
              </span>
            </span>
          </>
        ),
      })}

      {/* Always visible inside the card; the link reserves room on the right. */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="civic-press absolute top-2 right-2 flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-primary-soft hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Opening a pop-up is reading it. Same write as opening a row in the bell: the
 * cached feed is patched first, then the server, then the layout's unread count
 * (the badge and the bell dot) is refreshed.
 */
async function markRead(
  router: ReturnType<typeof useRouter>,
  userId: string,
  notificationId: string,
) {
  const ok = await updateNotificationPreview(
    userId,
    (rows) => rows.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    async () => {
      const result = await updateNotificationFn({
        data: { notificationId, action: "read" },
      });
      return !result.error;
    },
  );
  if (ok) {
    void router.invalidate({ filter: (match) => match.routeId === "/_authed/_dashboard" });
  }
}
