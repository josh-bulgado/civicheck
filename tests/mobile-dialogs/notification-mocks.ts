import type { NotificationRow } from "~/features/notifications/notifications.queries";

let notifications: NotificationRow[] = [];
export function seedNotifications(rows: NotificationRow[]) { notifications = rows; }
export const getMyNotificationsFn = async () => ({ items: notifications, hasMore: false });
export const getNotificationPreviewFn = async () => notifications;
export const updateNotificationFn = async ({ data }: { data: { notificationId: string; action: string } }) => {
  localStorage.setItem("notification-action", JSON.stringify(data));
  return { error: false };
};
