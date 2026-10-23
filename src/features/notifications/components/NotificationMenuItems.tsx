import { Archive, ArchiveRestore, Check, Undo2 } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import type { NotificationAction } from "~/features/notifications/notifications.mutations";
import type { NotificationRow } from "~/features/notifications/notifications.queries";

export interface RowHandlers {
  onOpen: (notification: NotificationRow) => void;
  onAction: (notification: NotificationRow, action: NotificationAction) => void;
}

/** The read/unread and archive choices, shared by both audiences' row menus. */
export function NotificationMenuItems({
  notification,
  onAction,
}: {
  notification: NotificationRow;
  onAction: RowHandlers["onAction"];
}) {
  return (
    <>
      {notification.isRead ? (
        <DropdownMenuItem onClick={() => onAction(notification, "unread")}>
          <Undo2 />
          Mark as unread
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => onAction(notification, "read")}>
          <Check />
          Mark as read
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      {notification.archivedAt !== null ? (
        <DropdownMenuItem onClick={() => onAction(notification, "unarchive")}>
          <ArchiveRestore />
          Restore to inbox
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => onAction(notification, "archive")}>
          <Archive />
          Archive
        </DropdownMenuItem>
      )}
    </>
  );
}
