"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  TYPE_STYLE,
  feedDetail,
  feedTitle,
  linkFor,
} from "~/features/notifications/notification-display";
import {
  TOAST_MS,
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
 * bell's feed shows for an unread update, on its own card. It stays for a few
 * seconds, holds still while the pointer or focus is on it (or the tab is out of
 * sight), and opens the notification when pressed.
 *
 * What feeds it, and what counts as an arrival, is in new-notification-toasts.
 */
export function NewNotificationToasts({ userId, lifted = false }: NewNotificationToastsProps) {
  useEffect(() => bindNotificationToasts(userId), [userId]);
  const toasts = useNotificationToasts(userId);

  return (
    // Always in the page, so a screen reader is already listening when a pop-up
    // lands in it. Clicks fall through everywhere but the cards.
    <div
      role="region"
      aria-label="New notifications"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-4 z-60 flex flex-col items-end gap-3 md:inset-x-auto md:right-6 md:bottom-6",
        lifted ? "bottom-[calc(env(safe-area-inset-bottom)+6.5rem)]" : "bottom-4",
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
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const pageHidden = usePageHidden();

  const dismiss = useCallback(() => dismissNotificationToast(key), [key]);
  useExpiry(dismiss, hovered || focused || pageHidden || leaving);

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
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") dismiss();
      }}
      className={cn(
        "group/toast pointer-events-auto relative w-full md:w-90",
        leaving ? "civic-toast-out" : "civic-toast-in",
      )}
    >
      {linkFor(notification.target, open, {
        className:
          "civic-interactive flex items-start gap-3.5 rounded-3xl bg-card p-3.5 shadow-portal-popover ring-1 ring-border-light outline-none hover:bg-[#f1f6fd] focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-primary-soft",
        children: (
          <>
            <span
              className={cn(
                "flex size-11.5 shrink-0 items-center justify-center rounded-full",
                unreadClass,
              )}
              aria-hidden="true"
            >
              <TypeIcon className="size-5.25" />
            </span>

            <span className="min-w-0 flex-1">
              {label ? (
                <span className="block truncate text-[13.5px] leading-snug font-semibold text-primary">
                  {label}
                </span>
              ) : null}
              <span className="mt-px block text-[15.5px] leading-[1.3] font-bold text-foreground">
                {feedTitle(notification.subject)}
              </span>
              {detail ? (
                <span className="mt-0.5 line-clamp-2 block text-[14px] leading-[1.35] text-body-2">
                  {detail}
                </span>
              ) : null}
              <span className="mt-1 block text-[13px] leading-snug font-semibold text-primary">
                Just now
              </span>
            </span>

            {/* Lined up with the middle of the 46px circle beside it. */}
            <span className="mt-4.25 size-3 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          </>
        ),
      })}

      {/* On the card's corner, out of the text's way. Shown on hover or focus;
          a touch screen has no hover, so it is always there. */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="civic-press absolute -top-2.5 -left-2.5 flex size-7 items-center justify-center rounded-full bg-card text-body-2 opacity-0 shadow-portal-popover ring-1 ring-border-light outline-none group-focus-within/toast:opacity-100 group-hover/toast:opacity-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:opacity-100"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Calls `onExpire` once the pop-up has been on screen for TOAST_MS. Time spent
 * paused doesn't count: the clock stops and picks up with what was left.
 */
function useExpiry(onExpire: () => void, paused: boolean) {
  const remaining = useRef(TOAST_MS);

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = setTimeout(onExpire, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(remaining.current - (Date.now() - startedAt), 0);
    };
  }, [paused, onExpire]);
}

function usePageHidden() {
  return useSyncExternalStore(
    (onChange) => {
      document.addEventListener("visibilitychange", onChange);
      return () => document.removeEventListener("visibilitychange", onChange);
    },
    () => document.hidden,
    () => false,
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
