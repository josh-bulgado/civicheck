import { useState, useTransition } from "react";
import { QuietLink } from "~/components/quiet-link";
import { Bell, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { staggerStyle } from "~/components/motion/stagger";
import { pillButton } from "~/components/portal/styles";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
  updateNotificationFn,
  type NotificationAction,
} from "~/features/notifications/notifications.mutations";
import { MarkAllReadButton } from "~/features/notifications/components/MarkAllReadButton";
import {
  NotificationMenuItems,
  type RowHandlers,
} from "~/features/notifications/components/NotificationMenuItems";
import { StaffNotifications } from "~/features/notifications/components/StaffNotifications";
import type { NotificationRow } from "~/features/notifications/notifications.queries";
import type { NotificationAudience } from "~/features/notifications/notification-audience";
import {
  TYPE_STYLE,
  feedDetail,
  feedTitle,
  feedWhen,
  linkFor,
} from "~/features/notifications/notification-display";
import { invalidateNotificationPreview } from "~/features/notifications/notification-preview-cache";

const UPDATE_FAILED = "We couldn't update your notifications. Please try again.";

function failureMessage(result: { error: boolean; message?: string }) {
  return result.message ?? UPDATE_FAILED;
}

interface NotificationsPageProps {
  /** Which feed this is: applicants get email-backed updates, CCRO staff in-system alerts. */
  audience: NotificationAudience;
  notifications: NotificationRow[];
  /** True when older notifications exist beyond what was loaded. */
  hasMore: boolean;
  /** Asks the route for the next page of older notifications. */
  onLoadMore: () => Promise<unknown>;
  /** Called after a mutation succeeds, so the route can re-run its loader. */
  onUpdated: () => void;
  /**
   * How many are unread in all, which can be more than the page has loaded. The
   * applicant's "Mark all as read" follows this, the number the sidebar badge
   * and the bell dot show, so the three always agree.
   */
  unreadTotal?: number;
}

// ─── Applicant portal ───────────────────────────────────────────────────────

/**
 * One notification: the service it is about, what happened, and when. Unread
 * ones also carry their one line of detail. The whole row opens the request;
 * archiving lives in a menu that takes the place of the time on hover, and
 * sits beside it where there is no hover.
 */
function PortalNotificationRow({
  notification,
  now,
  onOpen,
  onAction,
}: { notification: NotificationRow; now: number } & RowHandlers) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { icon: TypeIcon, unreadClass } = TYPE_STYLE[notification.type] ?? TYPE_STYLE.status_change;
  const unread = !notification.isRead;
  const detail = unread ? feedDetail(notification) : null;

  return (
    <div
      className={cn("group/row relative", unread && "bg-(image:--portal-unread-row)")}
    >
      {linkFor(notification.target, () => onOpen(notification), {
        className: cn(
          "civic-interactive flex items-center gap-4 px-5 hover:bg-primary/8 max-md:items-start max-md:gap-3.5 max-md:px-4.5 max-md:py-4 @3xl:gap-5 @3xl:px-8 [@media(hover:none)]:pr-16!",
          unread ? "py-5 @3xl:py-6" : "py-4 @3xl:py-5",
        ),
        children: (
          <>
            <span
              className={cn(
                "flex size-13 shrink-0 items-center justify-center rounded-full max-md:size-11",
                unread ? unreadClass : "bg-muted text-muted-foreground",
              )}
              aria-hidden="true"
            >
              <TypeIcon className="size-5.75 max-md:size-5" />
            </span>

            <span className="min-w-0 flex-1">
              {/* On a phone the time sits on this line, at the right; from md
                  it has a column of its own. */}
              <span className="flex items-baseline justify-between gap-2">
                {notification.serviceName ? (
                  <span
                    className={cn(
                      "block min-w-0 truncate text-[15px] leading-snug font-semibold max-md:text-[13px]",
                      unread ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {notification.serviceName}
                  </span>
                ) : (
                  <span />
                )}
                <time
                  dateTime={notification.sentAt}
                  className="shrink-0 text-[13px] text-muted-foreground md:hidden"
                >
                  {feedWhen(notification.sentAt, now)}
                </time>
              </span>
              <span
                className={cn(
                  "block leading-snug text-foreground",
                  unread
                    ? "text-xl font-bold max-md:text-[17px]"
                    : "text-[19px] font-medium max-md:text-[17px]",
                )}
              >
                {unread ? <span className="sr-only">Unread: </span> : null}
                {feedTitle(notification.subject)}
              </span>
              {detail ? (
                <span className="mt-0.5 line-clamp-2 block text-base leading-snug text-body-2 max-md:mt-1 max-md:text-sm max-md:leading-[1.4]">
                  {detail}
                </span>
              ) : null}
            </span>

            <time
              dateTime={notification.sentAt}
              className={cn(
                "shrink-0 text-[15px] text-muted-foreground max-md:hidden",
                menuOpen
                  ? "invisible"
                  : "group-hover/row:invisible group-focus-within/row:invisible",
              )}
            >
              {feedWhen(notification.sentAt, now)}
            </time>
          </>
        ),
      })}

      <div
        className={cn(
          "absolute top-1/2 right-4 -translate-y-1/2 transition-opacity @3xl:right-6",
          menuOpen
            ? "opacity-100"
            : "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            nativeButton
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-full bg-card text-muted-foreground shadow-[0_1px_3px_rgba(15,27,45,0.1)] hover:bg-card hover:text-primary data-open:text-primary"
              />
            }
          >
            <MoreHorizontal aria-hidden="true" />
            <span className="sr-only">
              More actions for "{feedTitle(notification.subject)}"
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <NotificationMenuItems notification={notification} onAction={onAction} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function PortalNotificationGroup({
  label,
  items,
  now,
  start,
  ...handlers
}: {
  label: string;
  items: NotificationRow[];
  now: number;
  /** Row number of this group's first row, so the entrance cascades through all groups. */
  start: number;
} & RowHandlers) {
  return (
    <section aria-label={label}>
      <h2 className="mb-2.5 px-1 text-[15px] leading-[normal] font-semibold text-muted-foreground md:mb-3 md:px-1.5 md:text-base">
        {label}
      </h2>
      <ul className="civic-stagger divide-y divide-border-light overflow-hidden rounded-4xl bg-card shadow-portal-card ring-2 ring-border-light md:rounded-[28px]">
        {items.map((notification, index) => (
          <li key={notification.id} style={staggerStyle(start + index)}>
            <PortalNotificationRow notification={notification} now={now} {...handlers} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface PortalNotificationsProps extends RowHandlers {
  notifications: NotificationRow[];
  /** Unread in all (see `unreadTotal`): what "Mark all as read" is lit by. */
  unreadCount: number;
  now: number;
  hasMore: boolean;
  isMarkingAll: boolean;
  isLoadingMore: boolean;
  onMarkAllRead: () => void;
  onLoadMore: () => void;
}

/**
 * The applicant's feed: what's new, then everything earlier. Archived ones stay
 * out of sight behind a small link under Earlier, shown only when there are any.
 */
function PortalNotifications({
  notifications,
  unreadCount,
  now,
  hasMore,
  isMarkingAll,
  isLoadingMore,
  onMarkAllRead,
  onLoadMore,
  ...handlers
}: PortalNotificationsProps) {
  const [showArchived, setShowArchived] = useState(false);

  const inbox = notifications.filter((n) => n.archivedAt === null);
  const fresh = inbox.filter((n) => !n.isRead);
  const earlier = inbox.filter((n) => n.isRead);
  const archived = notifications.filter((n) => n.archivedAt !== null);

  return (
    <div className="portal-page gap-4.5 md:gap-7">
      <div className="flex items-center justify-between gap-x-6 gap-y-3">
        <h1 className="portal-title">Notifications</h1>
        {/* Always here. It is lit while something is unread, and quiet (not
            gone) once nothing is, so it does not come and go under the cursor. */}
        <MarkAllReadButton
          hasUnread={unreadCount > 0 && !isMarkingAll}
          onClick={onMarkAllRead}
          className="h-10 px-4 text-sm md:h-12 md:px-6 md:text-base"
          compactLabel="Mark all read"
        />
      </div>

      {notifications.length === 0 ? (
        <Empty className="civic-enter-scale gap-5 rounded-[28px] bg-card px-8 py-16 shadow-portal-card">
          <EmptyHeader className="max-w-110 gap-3">
            <EmptyMedia
              variant="icon"
              className="size-13 rounded-[14px] bg-primary-soft text-primary"
            >
              <Bell />
            </EmptyMedia>
            <EmptyTitle className="text-xl font-bold">No notifications yet</EmptyTitle>
            <EmptyDescription className="leading-[1.55] text-pretty">
              Once you submit a request, we'll post an update here whenever staff review
              your documents or move it to the next step.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <QuietLink
              to="/my-requests"
              className={cn(buttonVariants({ variant: "outline" }), pillButton.outline)}
            >
              Go to my requests
            </QuietLink>
          </EmptyContent>
        </Empty>
      ) : (
        // The rows lay themselves out from this container's width, not the
        // window's: the sidebar takes a fixed share of the window.
        <div className="@container flex flex-col gap-6 md:gap-7">
          {inbox.length === 0 ? (
            <p className="rounded-[28px] bg-card px-6 py-12 text-center text-[15px] text-muted-foreground shadow-portal-card">
              You're all caught up. New updates will show up here.
            </p>
          ) : null}

          {fresh.length > 0 ? (
            <PortalNotificationGroup
              label="New"
              items={fresh}
              now={now}
              start={0}
              {...handlers}
            />
          ) : null}

          {earlier.length > 0 ? (
            <PortalNotificationGroup
              label="Earlier"
              items={earlier}
              now={now}
              start={fresh.length}
              {...handlers}
            />
          ) : null}

          {archived.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                aria-expanded={showArchived}
                onClick={() => setShowArchived((open) => !open)}
                className="self-start rounded-full px-1.5 py-1 text-[15px] font-semibold text-primary hover:text-primary-hover"
              >
                {showArchived ? "Hide archived" : `Archived (${archived.length})`}
              </button>
              {showArchived ? (
                <PortalNotificationGroup
                  label="Archived"
                  items={archived}
                  now={now}
                  start={0}
                  {...handlers}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className={pillButton.outline}
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading…" : "Load older notifications"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function NotificationsPage({
  audience,
  notifications,
  hasMore,
  onLoadMore,
  onUpdated,
  unreadTotal,
}: NotificationsPageProps) {
  const [isMarkingAll, startMarkAll] = useTransition();
  const [isLoadingMore, startLoadMore] = useTransition();

  const unreadCount = notifications.filter((n) => n.archivedAt === null && !n.isRead).length;
  const now = Date.now();

  async function applyAction(notification: NotificationRow, action: NotificationAction) {
    try {
      const result = await updateNotificationFn({
        data: { notificationId: notification.id, action },
      });
      if (result.error) {
        toast.error(failureMessage(result));
        return false;
      }
      // The bell's popover keeps its own cached copy of these rows.
      invalidateNotificationPreview();
      onUpdated();
      return true;
    } catch {
      toast.error(UPDATE_FAILED);
      return false;
    }
  }

  async function handleAction(notification: NotificationRow, action: NotificationAction) {
    const ok = await applyAction(notification, action);
    if (ok && action === "archive") {
      toast("Notification archived.", {
        action: { label: "Undo", onClick: () => void applyAction(notification, "unarchive") },
      });
    }
  }

  function handleOpen(notification: NotificationRow) {
    if (!notification.isRead) void applyAction(notification, "read");
  }

  function markAllRead() {
    startMarkAll(async () => {
      try {
        const result = await markAllNotificationsReadFn();
        if (result.error) {
          toast.error(failureMessage(result));
          return;
        }
        toast.success("All notifications marked as read.");
        invalidateNotificationPreview();
        onUpdated();
      } catch {
        toast.error(UPDATE_FAILED);
      }
    });
  }

  function loadMore() {
    startLoadMore(async () => {
      try {
        await onLoadMore();
      } catch {
        toast.error("We couldn't load older notifications. Please try again.");
      }
    });
  }

  const handlers: RowHandlers = { onOpen: handleOpen, onAction: handleAction };

  if (audience === "staff") {
    return (
      <StaffNotifications
        notifications={notifications}
        hasMore={hasMore}
        isMarkingAll={isMarkingAll}
        isLoadingMore={isLoadingMore}
        onMarkAllRead={markAllRead}
        onLoadMore={loadMore}
        {...handlers}
      />
    );
  }

  return (
    <PortalNotifications
      notifications={notifications}
      unreadCount={unreadTotal ?? unreadCount}
      now={now}
      hasMore={hasMore}
      isMarkingAll={isMarkingAll}
      isLoadingMore={isLoadingMore}
      onMarkAllRead={markAllRead}
      onLoadMore={loadMore}
      {...handlers}
    />
  );
}
