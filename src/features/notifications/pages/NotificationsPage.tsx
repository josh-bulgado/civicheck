import { useState, useTransition } from "react";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  Banknote,
  Bell,
  Check,
  CircleCheckBig,
  CircleX,
  FilePlus2,
  FileUp,
  FileWarning,
  MailWarning,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { staggerStyle } from "~/components/motion/stagger";
import { pillButton } from "~/components/portal/styles";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "~/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import {
  markAllNotificationsReadFn,
  updateNotificationFn,
  type NotificationAction,
} from "~/features/notifications/notifications.mutations";
import type {
  NotificationRow,
  NotificationTarget,
  NotificationType,
} from "~/features/notifications/notifications.queries";
import type { NotificationAudience } from "~/features/notifications/notification-audience";
import { usePermissions } from "~/hooks/usePermissions";

// CCRO Legazpi is a single-office deployment, so day boundaries are pinned to
// Philippine time. This also keeps the server-rendered and client-rendered
// group headings identical regardless of where either one happens to run.
const TIME_ZONE = "Asia/Manila";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabelFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const DAY_MS = 24 * 60 * 60 * 1000;

type Filter = "all" | "unread" | "archived";

const UPDATE_FAILED = "We couldn't update your notifications. Please try again.";

/** Sizing for a trigger inside the applicant header's `pill` tab track. */
const PILL_TAB = "h-9.5 flex-none px-3.5";

function failureMessage(result: { error: boolean; message?: string }) {
  return result.message ?? UPDATE_FAILED;
}

const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; unreadClass: string }> = {
  status_change: { icon: RefreshCw, unreadClass: "bg-primary text-white" },
  pre_validation_complete: { icon: CircleCheckBig, unreadClass: "bg-primary text-white" },
  document_rejected: { icon: FileWarning, unreadClass: "bg-tone-danger text-white" },
  new_request: { icon: FilePlus2, unreadClass: "bg-primary text-white" },
  document_resubmitted: { icon: FileUp, unreadClass: "bg-primary text-white" },
  awaiting_cashier: { icon: Banknote, unreadClass: "bg-primary text-white" },
  ready_to_release: { icon: CircleCheckBig, unreadClass: "bg-primary text-white" },
  request_incomplete: { icon: FileWarning, unreadClass: "bg-tone-danger text-white" },
  request_rejected: { icon: CircleX, unreadClass: "bg-tone-danger text-white" },
  message: { icon: MessageSquare, unreadClass: "bg-primary text-white" },
  new_message: { icon: MessageSquare, unreadClass: "bg-primary text-white" },
};

/** One typed `Link` per destination, so each keeps its own params/search checking. */
function linkFor(target: NotificationTarget, onClick: () => void) {
  switch (target.to) {
    case "/requests/$requestId":
      return (
        <Link to="/requests/$requestId" params={{ requestId: target.requestId }} onClick={onClick} />
      );
    case "/cashier":
      return <Link to="/cashier" search={{ tracking: target.tracking }} onClick={onClick} />;
    default:
      return (
        <Link
          to="/my-requests/$requestId"
          params={{ requestId: target.requestId }}
          onClick={onClick}
        />
      );
  }
}

interface DayGroup {
  key: string;
  label: string;
  items: NotificationRow[];
}

/** Items arrive newest-first, so a single pass yields correctly ordered groups. */
function groupByDay(items: NotificationRow[], now: number): DayGroup[] {
  const today = dayKeyFormat.format(now);
  const yesterday = dayKeyFormat.format(now - DAY_MS);
  const groups: DayGroup[] = [];
  for (const item of items) {
    const sent = new Date(item.sentAt);
    const key = dayKeyFormat.format(sent);
    let group = groups[groups.length - 1];
    if (group?.key !== key) {
      group = {
        key,
        label: key === today ? "Today" : key === yesterday ? "Yesterday" : dayLabelFormat.format(sent),
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
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
}

interface RowHandlers {
  onOpen: (notification: NotificationRow) => void;
  onAction: (notification: NotificationRow, action: NotificationAction) => void;
}

function NotificationItem({
  notification,
  onOpen,
  onAction,
}: { notification: NotificationRow } & RowHandlers) {
  const { icon: TypeIcon, unreadClass } = TYPE_STYLE[notification.type] ?? TYPE_STYLE.status_change;
  const isArchived = notification.archivedAt !== null;

  return (
    <div className={cn("flex items-stretch", !notification.isRead && "bg-primary-soft/40")}>
      <Item
        render={linkFor(notification.target, () => onOpen(notification))}
        className="min-w-0 flex-1 flex-nowrap items-start gap-4 rounded-none px-5 py-5 sm:px-6"
      >
        <ItemMedia
          variant="icon"
          className={cn(
            "size-10 rounded-xl",
            notification.isRead ? "bg-muted text-muted-foreground" : unreadClass,
          )}
        >
          <TypeIcon className="size-4.5" aria-hidden="true" />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle
            className={cn(
              "line-clamp-none text-[15px] text-foreground",
              notification.isRead ? "font-medium" : "font-bold",
            )}
          >
            {notification.subject}
            {notification.isRead ? null : (
              <>
                <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span className="sr-only">Unread</span>
              </>
            )}
          </ItemTitle>
          <ItemDescription className="line-clamp-none whitespace-pre-line text-body-2 text-pretty">
            {notification.body}
          </ItemDescription>
          {notification.status === "failed" ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
              <MailWarning className="size-3.5 shrink-0" aria-hidden="true" />
              We couldn't email you this update, but it's saved here.
            </p>
          ) : null}
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {notification.trackingNumber} · {timeFormat.format(new Date(notification.sentAt))}
          </p>
        </ItemContent>
      </Item>
      <ItemActions className="gap-0 pr-3">
        {notification.isRead ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-full text-muted-foreground hover:text-primary"
            aria-label={`Mark "${notification.subject}" as read`}
            onClick={() => onAction(notification, "read")}
          >
            <Check aria-hidden="true" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-full text-muted-foreground data-open:bg-muted"
              />
            }
          >
            <MoreHorizontal aria-hidden="true" />
            <span className="sr-only">More actions for "{notification.subject}"</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
            {isArchived ? (
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
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </div>
  );
}

function NotificationList({
  items,
  now,
  emptyMessage,
  citizen,
  ...handlers
}: {
  items: NotificationRow[];
  now: number;
  emptyMessage: string;
  /** Applicant portal: flat cards on the ground instead of bordered panels. */
  citizen: boolean;
} & RowHandlers) {
  const panel = citizen ? "portal-card" : "dashboard-panel";

  if (items.length === 0) {
    return (
      <div className={panel}>
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  let index = 0;
  return (
    <div className={cn("flex flex-col", citizen ? "gap-4" : "gap-6")}>
      {groupByDay(items, now).map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="mb-2 px-2 pt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {group.label}
          </h2>
          <div className={cn(panel, "overflow-hidden")}>
            <div className="civic-stagger divide-y divide-border-lighter">
              {group.items.map((notification) => (
                <div key={notification.id} style={staggerStyle(index++)}>
                  <NotificationItem notification={notification} {...handlers} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function NotificationsPage({
  audience,
  notifications,
  hasMore,
  onLoadMore,
  onUpdated,
}: NotificationsPageProps) {
  const isApplicant = audience === "applicant";
  const { can } = usePermissions();
  const [filter, setFilter] = useState<Filter>("all");
  const [isMarkingAll, startMarkAll] = useTransition();
  const [isLoadingMore, startLoadMore] = useTransition();

  const inbox = notifications.filter((n) => n.archivedAt === null);
  const unread = inbox.filter((n) => !n.isRead);
  const archived = notifications.filter((n) => n.archivedAt !== null);
  const unreadCount = unread.length;
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

  const tabPanels = (
    <>
      <TabsContent value="all">
        <NotificationList
          items={inbox}
          now={now}
          emptyMessage="Your inbox is empty. Archived notifications are in the Archived tab."
          citizen={isApplicant}
          {...handlers}
        />
      </TabsContent>
      <TabsContent value="unread">
        <NotificationList
          items={unread}
          now={now}
          emptyMessage="You're all caught up. New updates will show up here."
          citizen={isApplicant}
          {...handlers}
        />
      </TabsContent>
      <TabsContent value="archived">
        <NotificationList
          items={archived}
          now={now}
          emptyMessage="Nothing archived. Use the ⋯ menu on a notification to tuck it away."
          citizen={isApplicant}
          {...handlers}
        />
      </TabsContent>
    </>
  );

  // The applicant portal: a header card with the filter pills in it, then the
  // day groups as their own cards. `Tabs` wraps the page so the pills can sit
  // in the header while the panels sit below it.
  if (isApplicant) {
    return (
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as Filter)}
        className="portal-page gap-4"
      >
        <header className="portal-card flex flex-col gap-6 px-5 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-wrap items-end gap-6">
            <div className="mr-auto flex max-w-160 flex-col gap-1.5">
              <h1 className="portal-title">Notifications</h1>
              <p className="text-sm leading-normal text-muted-foreground text-pretty">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"} on your requests. We also email you each one.`
                  : "You're all caught up. We'll post here, and email you, whenever a request changes."}
              </p>
            </div>
            {unreadCount > 0 ? (
              <Button
                variant="outline"
                className={cn(pillButton.outline, "text-primary")}
                onClick={markAllRead}
                disabled={isMarkingAll}
              >
                <Check data-icon="inline-start" aria-hidden="true" />
                {isMarkingAll ? "Marking as read…" : "Mark all as read"}
              </Button>
            ) : null}
          </div>
          {notifications.length > 0 ? (
            <TabsList
              variant="pill"
              aria-label="Filter notifications"
              className="no-scrollbar max-w-full justify-start self-start overflow-x-auto"
            >
              <TabsTrigger value="all" className={PILL_TAB}>
                All ({inbox.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className={PILL_TAB}>
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="archived" className={PILL_TAB}>
                Archived ({archived.length})
              </TabsTrigger>
            </TabsList>
          ) : null}
        </header>

        {notifications.length === 0 ? (
          <Empty className="portal-card civic-enter-scale gap-5 rounded-2xl px-8 py-16">
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
              <Link
                to="/my-requests"
                className={cn(buttonVariants({ variant: "outline" }), pillButton.outline)}
              >
                Go to my requests
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          tabPanels
        )}

        {hasMore ? (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              className={pillButton.outline}
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading…" : "Load older notifications"}
            </Button>
          </div>
        ) : null}
      </Tabs>
    );
  }

  return (
    <div className="dashboard-page max-w-4xl">
      <header className="dashboard-hero">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
              CCRO workspace
            </p>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              Notifications
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              {unreadCount > 0
                ? `You have ${unreadCount} unread ${unreadCount === 1 ? "alert" : "alerts"} that need your attention.`
                : "You're all caught up. Requests that need your action will show up here."}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="outline"
              className="civic-press shrink-0 bg-white text-primary hover:bg-primary-soft"
              onClick={markAllRead}
              disabled={isMarkingAll}
            >
              <Check data-icon="inline-start" aria-hidden="true" />
              {isMarkingAll ? "Marking as read…" : "Mark all as read"}
            </Button>
          ) : null}
        </div>
      </header>

      {notifications.length === 0 ? (
        <Empty className="dashboard-panel civic-enter-scale mx-auto mt-8 max-w-lg border-0 px-6 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-primary text-white shadow-md">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>No notifications yet</EmptyTitle>
            <EmptyDescription>
              When a request needs your action, it will be posted here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {can("requests:view_all") ? (
              <Link
                to="/requests"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Open the request queue
              </Link>
            ) : (
              <Link
                to="/cashier"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Open the cashier counter
              </Link>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as Filter)}
          className="mt-6"
        >
          <TabsList aria-label="Filter notifications">
            <TabsTrigger value="all">All ({inbox.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
          </TabsList>
          {tabPanels}
        </Tabs>
      )}

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" size="lg" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading…" : "Load older notifications"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
