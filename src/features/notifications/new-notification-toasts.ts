import { useSyncExternalStore } from "react";
import type { RealtimeRowEvent } from "~/hooks/useRealtimeRefresh";
import {
  getMyNotificationsFn,
  type NotificationRow,
} from "~/features/notifications/notifications.queries";

/**
 * The pop-up that slides in at the bottom right when a notification arrives.
 *
 * The realtime channel only says "a row appeared". The pop-up needs the whole
 * notification (the service it is about, where it leads), so an arrival is
 * looked up through the same server function the full page uses, rather than
 * rebuilt from the raw row. A missed lookup costs nothing: the badge and the
 * feed still have the notification.
 *
 * Module state, like notification-preview-cache: it has to outlive the layout's
 * re-renders, and it is only touched from the browser.
 */

/** Pop-ups on screen at once. A fourth pushes the oldest out. */
export const MAX_TOASTS = 3;
/** How long a pop-up stays before it leaves on its own. */
export const TOAST_MS = 8_000;
/** How long the leave animation gets before the pop-up is removed. */
export const TOAST_EXIT_MS = 160;
/** Arrivals this close together (one status change can write several) share one lookup. */
const BATCH_MS = 150;
/** A refreshed staff alert counts as new only if it was bumped this recently. */
const FRESH_MS = 10_000;
/** More than the stack holds, in case the arrivals were not the newest rows. */
const LOOKUP_LIMIT = MAX_TOASTS + 2;

export interface NotificationToast {
  /** Changes every time a pop-up is shown, so a repeat restarts its animation and timer. */
  key: number;
  notification: NotificationRow;
  /** Playing its exit animation; removed a moment later. */
  leaving: boolean;
}

interface Snapshot {
  userId: string | null;
  toasts: NotificationToast[];
}

const EMPTY: Snapshot = { userId: null, toasts: [] };

let snapshot = EMPTY;
let nextKey = 1;
let pending = new Set<string>();
let batchTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

/**
 * Is this row change a notification the person hasn't seen yet?
 *
 * Every insert is. An update is only for staff alerts: when a request already
 * has an unread `new_request` / `document_resubmitted` alert, the database
 * refreshes that row in place (moves it to now) instead of inserting another.
 * Other updates (read, unread, archive) never touch `created_at`, so a row that
 * is unread and was stamped a moment ago is the refresh and not one of those.
 */
export function isNewArrival(
  { eventType, table, row }: RealtimeRowEvent,
  now = Date.now(),
): boolean {
  if (row.is_read === true || row.archived_at) return false;
  if (eventType === "INSERT") return true;
  if (eventType !== "UPDATE" || table !== "staff_notifications") return false;
  return now - Date.parse(String(row.created_at)) < FRESH_MS;
}

/** The stack after `notification` arrives: newest last, a repeat replaced, the oldest dropped past the cap. */
export function addToast(
  toasts: NotificationToast[],
  notification: NotificationRow,
  key: number,
): NotificationToast[] {
  const next = [
    ...toasts.filter((toast) => toast.notification.id !== notification.id),
    { key, notification, leaving: false },
  ];
  return next.slice(-MAX_TOASTS);
}

/** Starts clean when a different person is signed in on this tab. */
function adopt(userId: string) {
  if (snapshot.userId === userId) return;
  pending = new Set();
  clearTimeout(batchTimer);
  publish({ userId, toasts: [] });
}

/** Clears everything, for when the layout goes away. */
function reset() {
  pending = new Set();
  clearTimeout(batchTimer);
  publish({ userId: null, toasts: [] });
}

async function lookUpPending(userId: string) {
  const ids = pending;
  pending = new Set();
  try {
    const { items } = await getMyNotificationsFn({ data: { limit: LOOKUP_LIMIT } });
    // Someone else signed in while this was on its way.
    if (snapshot.userId !== userId) return;
    // The feed is newest first; the stack reads oldest first, newest at the corner.
    for (const notification of items.filter((n) => ids.has(n.id) && !n.isRead).reverse()) {
      publish({ toasts: addToast(snapshot.toasts, notification, nextKey++) });
    }
  } catch {
    // Nothing to show; the badge already counts it.
  }
}

/** Call with the id of a notification that has just arrived. */
export function announceNotification(userId: string, notificationId: string) {
  adopt(userId);
  pending.add(notificationId);
  clearTimeout(batchTimer);
  batchTimer = setTimeout(() => void lookUpPending(userId), BATCH_MS);
}

/** Plays the pop-up's exit animation, then removes it. */
export function dismissNotificationToast(key: number) {
  if (!snapshot.toasts.some((toast) => toast.key === key && !toast.leaving)) return;
  publish({
    toasts: snapshot.toasts.map((toast) =>
      toast.key === key ? { ...toast, leaving: true } : toast,
    ),
  });
  setTimeout(() => {
    publish({ toasts: snapshot.toasts.filter((toast) => toast.key !== key) });
  }, TOAST_EXIT_MS);
}

/**
 * Ties the stack to one signed-in person for as long as the caller is mounted.
 * Returned as a cleanup so it can be an effect body.
 */
export function bindNotificationToasts(userId: string): () => void {
  adopt(userId);
  return reset;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The pop-ups for `userId`; never another person's, even for a render. */
export function useNotificationToasts(userId: string): NotificationToast[] {
  const current = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
  return current.userId === userId ? current.toasts : EMPTY.toasts;
}
