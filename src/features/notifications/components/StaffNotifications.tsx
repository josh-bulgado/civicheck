import { useMemo, useState } from "react";
import { Bell, Check, Loader2, MoreHorizontal, SlidersHorizontal } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { staggerStyle } from "~/components/motion/stagger";
import { Button, buttonVariants } from "~/components/ui/button";
import { FilterChips, TableSearch } from "~/components/ui/data-table-toolbar";
import { PageHeaderCard } from "~/components/ui/page-header-card";
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
import { Toggle } from "~/components/ui/toggle";
import {
  NotificationMenuItems,
  type RowHandlers,
} from "~/features/notifications/components/NotificationMenuItems";
import {
  DAY_MS,
  TIME_ZONE,
  TYPE_STYLE,
  dayKeyFormat,
  feedTitle,
  linkFor,
  timeFormat,
} from "~/features/notifications/notification-display";
import type { NotificationRow } from "~/features/notifications/notifications.queries";
import {
  countNotifications,
  filterNotifications,
  type StaffNotificationFilter,
} from "~/features/notifications/staff-notification-filters";
import { usePermissions } from "~/hooks/usePermissions";
import { cn } from "~/lib/utils";

const dayLabelFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

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

function emptyMessage(filter: StaffNotificationFilter, needsOnly: boolean, search: string) {
  const query = search.trim();
  if (query) return `No notifications match “${query}”.`;
  if (needsOnly) return "Nothing needs your action right now.";
  if (filter === "unread") return "You're all caught up. New alerts will show up here.";
  if (filter === "archived") {
    return "Nothing archived. Use the ⋯ menu on a notification to tuck it away.";
  }
  return "Your inbox is empty. Archived notifications are in the Archived filter.";
}

/**
 * One alert: what happened, the request it is about, and when. The whole row
 * opens the request. Reading and archiving sit in a pill that takes the place
 * of the time on hover or focus, and stays visible where there is no hover.
 */
function StaffNotificationRow({
  notification,
  onOpen,
  onAction,
}: { notification: NotificationRow } & RowHandlers) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { icon: TypeIcon, unreadClass } = TYPE_STYLE[notification.type] ?? TYPE_STYLE.status_change;
  const unread = !notification.isRead;
  const title = feedTitle(notification.subject);

  return (
    <div className={cn("group/row relative", unread && "bg-primary-soft/40")}>
      {unread ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-2 size-1.5 -translate-y-1/2 rounded-full bg-primary"
        />
      ) : null}
      {linkFor(notification.target, () => onOpen(notification), {
        className:
          "civic-interactive flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface-subtle [@media(hover:none)]:pr-24",
        children: (
          <>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                unread ? unreadClass : "bg-muted text-muted-foreground",
              )}
              aria-hidden="true"
            >
              <TypeIcon className="size-4.5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <span
                  className={cn(
                    "text-[15px] leading-snug text-foreground",
                    unread ? "font-bold" : "font-medium",
                  )}
                >
                  {unread ? <span className="sr-only">Unread: </span> : null}
                  {title}
                </span>
                <span className="font-mono text-xs font-bold text-primary">
                  {notification.trackingNumber}
                </span>
              </span>
              <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-body-2 md:line-clamp-1">
                {notification.body}
              </span>
            </span>

            <time
              dateTime={notification.sentAt}
              className={cn(
                "shrink-0 text-[13px] text-muted-foreground tabular-nums",
                menuOpen
                  ? "invisible"
                  : "group-hover/row:invisible group-focus-within/row:invisible",
              )}
            >
              {timeFormat.format(new Date(notification.sentAt))}
            </time>
          </>
        ),
      })}

      <div
        className={cn(
          "absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-0.5 rounded-full bg-card p-0.5 shadow-[0_1px_4px_rgba(15,27,45,0.18)] transition-opacity",
          menuOpen
            ? "opacity-100"
            : "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        {unread ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-muted-foreground hover:text-primary [@media(hover:none)]:size-11"
            aria-label={`Mark "${title}" as read`}
            onClick={() => onAction(notification, "read")}
          >
            <Check aria-hidden="true" />
          </Button>
        ) : null}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            nativeButton
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full text-muted-foreground data-open:bg-muted data-open:text-primary [@media(hover:none)]:size-11"
              />
            }
          >
            <MoreHorizontal aria-hidden="true" />
            <span className="sr-only">More actions for "{title}"</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <NotificationMenuItems notification={notification} onAction={onAction} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface StaffNotificationsProps extends RowHandlers {
  notifications: NotificationRow[];
  hasMore: boolean;
  isMarkingAll: boolean;
  isLoadingMore: boolean;
  onMarkAllRead: () => void;
  onLoadMore: () => void;
}

/**
 * The CCRO feed, laid out like the Request Queue: a header card with the
 * counts, then one card holding the toolbar and the alerts grouped by day.
 * Admins, staff, supervisors and the cashier all read it.
 */
export function StaffNotifications({
  notifications,
  hasMore,
  isMarkingAll,
  isLoadingMore,
  onMarkAllRead,
  onLoadMore,
  ...handlers
}: StaffNotificationsProps) {
  const { can } = usePermissions();
  const [filter, setFilter] = useState<StaffNotificationFilter>("all");
  const [needsOnly, setNeedsOnly] = useState(false);
  const [search, setSearch] = useState("");

  const counts = useMemo(() => countNotifications(notifications), [notifications]);
  const visible = useMemo(
    () => filterNotifications(notifications, { filter, needsOnly, search }),
    [notifications, filter, needsOnly, search],
  );
  const now = Date.now();
  const hasActiveFilters = filter !== "all" || needsOnly || search.trim() !== "";

  function clearFilters() {
    setFilter("all");
    setNeedsOnly(false);
    setSearch("");
  }

  let rowIndex = 0;

  return (
    <div className="dashboard-page">
      <PageHeaderCard
        title="Notifications"
        description={`CCRO Administration, ${counts.all} ${counts.all === 1 ? "notification" : "notifications"}${
          counts.needs > 0 ? `, ${counts.needs} need action` : ""
        }`}
      >
        <Button
          variant={counts.unread > 0 ? "raised" : "ghost"}
          size="lg"
          onClick={onMarkAllRead}
          disabled={counts.unread === 0 || isMarkingAll}
        >
          {isMarkingAll ? (
            <Loader2 aria-hidden="true" data-icon="inline-start" className="animate-spin" />
          ) : (
            <Check aria-hidden="true" data-icon="inline-start" />
          )}
          {isMarkingAll ? "Marking as read…" : "Mark all as read"}
        </Button>
      </PageHeaderCard>

      {notifications.length === 0 ? (
        <Empty className="dashboard-panel civic-enter-scale mx-auto mt-8 max-w-lg border-0 px-6 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-primary-fill text-white shadow-md">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>No notifications yet</EmptyTitle>
            <EmptyDescription>
              When a request needs your action, it will be posted here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {can("requests:view_all") ? (
              <QuietLink
                to="/requests"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Open the request queue
              </QuietLink>
            ) : (
              <QuietLink
                to="/cashier"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Open the cashier counter
              </QuietLink>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-strong bg-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <TableSearch
                value={search}
                onChange={setSearch}
                placeholder="Search by tracking number or alert…"
                label="Search notifications"
              />
              <FilterChips
                label="Filter notifications"
                value={filter}
                onValueChange={setFilter}
                options={[
                  { value: "all", label: "All", count: counts.all },
                  {
                    value: "unread",
                    label: "Unread",
                    count: counts.unread,
                    dotClassName: "bg-health-info-dot",
                  },
                  {
                    value: "archived",
                    label: "Archived",
                    count: counts.archived,
                    dotClassName: "bg-muted-foreground",
                  },
                ]}
              />
              {/* Combines with any chip, like the request queue's Needs You. */}
              <Toggle
                size="lg"
                pressed={needsOnly}
                onPressedChange={setNeedsOnly}
                className="rounded-full border border-border-strong px-3.5 font-semibold text-body-2 aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
              >
                Needs You
                <span className="tabular-nums opacity-70">{counts.needs}</span>
              </Toggle>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 px-5 text-center text-muted-foreground">
              <SlidersHorizontal aria-hidden="true" className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">{emptyMessage(filter, needsOnly, search)}</p>
              {hasActiveFilters ? (
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-0 text-xs"
                >
                  Clear Filters
                </Button>
              ) : null}
            </div>
          ) : (
            groupByDay(visible, now).map((group, groupIndex) => (
              <section key={group.key} aria-label={group.label}>
                <h2
                  className={cn(
                    "border-b border-border bg-surface-subtle px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground",
                    groupIndex > 0 && "border-t",
                  )}
                >
                  {group.label}
                </h2>
                <ul className="civic-stagger divide-y divide-border-lighter">
                  {group.items.map((notification) => (
                    <li key={notification.id} style={staggerStyle(rowIndex++)}>
                      <StaffNotificationRow notification={notification} {...handlers} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}

      {hasMore ? (
        <div className="flex flex-col items-center gap-2">
          <Button variant="outline" size="lg" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading…" : "Load older notifications"}
          </Button>
          {search.trim() ? (
            <p className="text-xs text-muted-foreground">
              Search covers the notifications loaded so far.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
