import type {
  NotificationRow,
  NotificationType,
} from "~/features/notifications/notifications.queries";

export type StaffNotificationFilter = "all" | "unread" | "archived";

/**
 * The alerts that ask their reader to do something: validate a new request,
 * review a re-uploaded document, answer an applicant, confirm payment at the
 * counter. They are the ones sent to staff, supervisors and the cashier. The
 * rest (incomplete, rejected, ready to release) go to admins as news.
 */
const NEEDS_ACTION_TYPES: ReadonlySet<NotificationType> = new Set([
  "new_request",
  "document_resubmitted",
  "new_message",
  "awaiting_cashier",
]);

/** Unread, in the inbox, and one that asks for action. */
export function needsAction(notification: NotificationRow): boolean {
  return (
    !notification.isRead &&
    notification.archivedAt === null &&
    NEEDS_ACTION_TYPES.has(notification.type)
  );
}

/** Tracking number, title or body. Case and surrounding spaces do not matter. */
export function matchesSearch(notification: NotificationRow, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [notification.trackingNumber, notification.subject, notification.body].some(
    (field) => field.toLowerCase().includes(query),
  );
}

export interface NotificationCounts {
  /** In the inbox: not archived. */
  all: number;
  unread: number;
  archived: number;
  needs: number;
}

/** The chips are the overview as well as the filter, so these ignore the search. */
export function countNotifications(items: NotificationRow[]): NotificationCounts {
  const counts: NotificationCounts = { all: 0, unread: 0, archived: 0, needs: 0 };
  for (const item of items) {
    if (item.archivedAt !== null) {
      counts.archived += 1;
      continue;
    }
    counts.all += 1;
    if (!item.isRead) counts.unread += 1;
    if (needsAction(item)) counts.needs += 1;
  }
  return counts;
}

interface FilterOptions {
  filter: StaffNotificationFilter;
  /** The Needs You toggle. It combines with any chip, like the request queue's. */
  needsOnly: boolean;
  search: string;
}

export function filterNotifications(
  items: NotificationRow[],
  { filter, needsOnly, search }: FilterOptions,
): NotificationRow[] {
  return items.filter((item) => {
    const archived = item.archivedAt !== null;
    if (filter === "archived" ? !archived : archived) return false;
    if (filter === "unread" && item.isRead) return false;
    if (needsOnly && !needsAction(item)) return false;
    return matchesSearch(item, search);
  });
}
