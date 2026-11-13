"use client";

import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { ChevronRight, X } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { useMediaQuery } from "~/hooks/use-media-query";
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
  const isMobile = useMediaQuery("(max-width: 767px)");
  const visibleToasts = isMobile ? toasts.slice(-1) : toasts;

  return (
    // Always in the page so a screen reader hears arrivals. An empty stack lets
    // clicks through. Phones show the latest preview; older arrivals remain in
    // the queue until dismissed or opened together in Notifications.
    <div
      role="region"
      aria-label="New notifications"
      aria-live="polite"
      className={cn(
        "fixed inset-x-3 z-60 flex max-h-[min(28rem,calc(100dvh-2rem))] flex-col items-end gap-2 overflow-y-auto overscroll-contain p-1 md:inset-x-auto md:right-5 md:bottom-5 md:max-h-[min(28rem,calc(100dvh-3rem))] md:gap-3",
        toasts.length > 0 ? "pointer-events-auto" : "pointer-events-none",
        lifted
          ? "bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+5rem)] max-h-[min(28rem,calc(100dvh-env(safe-area-inset-bottom)-7.5rem))] md:max-h-[min(28rem,calc(100dvh-3rem))]"
          : "bottom-3",
      )}
    >
      {isMobile && toasts.length > 1 ? (
        <QuietLink to="/notifications"
          onClick={() => toasts.forEach((toast) => dismissNotificationToast(toast.key))}
          className="civic-press flex min-h-11 max-w-full items-center gap-2 rounded-full bg-card px-3.5 text-xs font-semibold text-primary shadow-portal-hairline outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {toasts.length} new notifications<ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
        </QuietLink>
      ) : null}
      {visibleToasts.map((toast) => (
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
          "civic-interactive flex items-start gap-2.5 rounded-2xl bg-card p-3 pr-12 shadow-portal-popover ring-1 ring-border-light outline-none hover:bg-[#f1f6fd] focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-primary-soft max-md:shadow-portal-hairline md:gap-3 md:p-4 md:pr-12",
        children: (
          <>
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full md:size-10",
                unreadClass,
              )}
              aria-hidden="true"
            >
              <TypeIcon className="size-4 md:size-5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-snug font-semibold text-foreground max-md:line-clamp-2 md:text-[15px]">
                {feedTitle(notification.subject)}
              </span>
              {label ? (
                <span className="mt-1 line-clamp-1 text-xs leading-snug wrap-anywhere text-body-2 md:line-clamp-2 md:text-[13.5px]">
                  {label}
                </span>
              ) : null}
              {detail ? (
                <span className="mt-0.5 block text-[13px] leading-[1.125rem] text-body-2 wrap-anywhere max-md:line-clamp-2 md:text-[14px] md:leading-[1.35]">
                  {detail}
                </span>
              ) : null}
              <span className="mt-2 hidden items-center gap-1.5 text-xs leading-snug text-muted-foreground md:flex">
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
        className="civic-press absolute top-0.5 right-0.5 flex size-11 items-center justify-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-primary-soft hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary md:top-2 md:right-2 md:size-8 md:rounded-lg"
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
