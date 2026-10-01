import { useState, useTransition } from "react";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  CircleCheckBig,
  FileWarning,
  MailWarning,
  MoreHorizontal,
  RefreshCw,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { staggerStyle } from "~/components/motion/stagger";
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
  NotificationType,
} from "~/features/notifications/notifications.queries";

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

function failureMessage(result: { error: boolean; message?: string }) {
  return result.message ?? UPDATE_FAILED;
}

const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; unreadClass: string }> = {
  status_change: { icon: RefreshCw, unreadClass: "bg-primary text-white" },
  pre_validation_complete: { icon: CircleCheckBig, unreadClass: "bg-primary text-white" },
  document_rejected: { icon: FileWarning, unreadClass: "bg-destructive text-white" },
};

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
        render={
          <Link
            to="/my-requests/$requestId"
            params={{ requestId: notification.requestId }}
            onClick={() => onOpen(notification)}
          />
        }
        className="min-w-0 flex-1 flex-nowrap items-start gap-4 rounded-none p-5"
      >
        <ItemMedia
          variant="icon"
          className={cn(
            "mt-1 size-9 rounded-lg",
            notification.isRead ? "bg-surface-subtle text-muted-foreground" : unreadClass,
          )}
        >
          <TypeIcon aria-hidden="true" />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle
            className={cn(
              "line-clamp-none text-foreground",
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
          <ItemDescription className="line-clamp-none whitespace-pre-line">
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
            className="size-11 text-muted-foreground"
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
                className="size-11 text-muted-foreground data-open:bg-muted"
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
  ...handlers
}: { items: NotificationRow[]; now: number; emptyMessage: string } & RowHandlers) {
  if (items.length === 0) {
    return (
      <div className="dashboard-panel">
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  let index = 0;
  return (
    <div className="flex flex-col gap-6">
      {groupByDay(items, now).map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {group.label}
          </h2>
          <div className="dashboard-panel overflow-hidden">
            <div className="civic-stagger divide-y divide-border">
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
  notifications,
  hasMore,
  onLoadMore,
  onUpdated,
}: NotificationsPageProps) {
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

  return (
    <div className="dashboard-page max-w-4xl">
      <header className="dashboard-hero">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
              Applicant workspace
            </p>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              Notifications
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              {unreadCount > 0
                ? `You have ${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"} on your requests. We also email you each one.`
                : "You're all caught up. We'll post here, and email you, whenever a request changes."}
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
              Once you submit a request, we'll post an update here whenever staff review your
              documents or move it to the next step.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/my-requests"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Go to my requests
            </Link>
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
          <TabsContent value="all">
            <NotificationList
              items={inbox}
              now={now}
              emptyMessage="Your inbox is empty. Archived notifications are in the Archived tab."
              {...handlers}
            />
          </TabsContent>
          <TabsContent value="unread">
            <NotificationList
              items={unread}
              now={now}
              emptyMessage="You're all caught up. New updates will show up here."
              {...handlers}
            />
          </TabsContent>
          <TabsContent value="archived">
            <NotificationList
              items={archived}
              now={now}
              emptyMessage="Nothing archived. Use the ⋯ menu on a notification to tuck it away."
              {...handlers}
            />
          </TabsContent>
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
