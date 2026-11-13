import { Bell } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";

/** The citizen bell opens the full feed; its dot follows the live unread count. */
export function NotificationBellLink({ unreadCount }: { unreadCount: number }) {
  return (
    <QuietLink
      to="/notifications"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      className="civic-press relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border-light bg-card text-portal-ink-2 outline-none hover:bg-primary-tint focus-visible:ring-[3px] focus-visible:ring-ring/50 md:size-12.5"
    >
      <Bell className="size-5" aria-hidden="true" />
      {unreadCount > 0 ? (
        <span aria-hidden="true" className="absolute top-2.75 right-3 size-2.25 rounded-full bg-brand-gold ring-2 ring-card md:top-3 md:right-3.25 md:size-2.5" />
      ) : null}
    </QuietLink>
  );
}
