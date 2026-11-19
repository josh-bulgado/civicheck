import { MarkAllReadButton } from "./MarkAllReadButton";

export function PortalNotificationsHeader({ hasUnread = false, onMarkAllRead = () => {} }: {
  hasUnread?: boolean;
  onMarkAllRead?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-x-6 gap-y-3">
      <h1 className="portal-title">Notifications</h1>
      <MarkAllReadButton hasUnread={hasUnread} onClick={onMarkAllRead}
        className="h-10 px-4 text-sm md:h-12 md:px-6 md:text-base" compactLabel="Mark all read" />
    </div>
  );
}
