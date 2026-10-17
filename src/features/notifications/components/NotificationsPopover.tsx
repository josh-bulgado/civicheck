"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "@tanstack/react-router";
import { QuietLink } from "~/components/quiet-link";
import { Bell, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { staggerStyle } from "~/components/motion/stagger";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import {
  TYPE_STYLE,
  feedDetail,
  feedTitle,
  feedWhen,
  linkFor,
} from "~/features/notifications/notification-display";
import {
  ensureNotificationPreview,
  updateNotificationPreview,
  useNotificationPreview,
} from "~/features/notifications/notification-preview-cache";
import { MarkAllReadButton } from "~/features/notifications/components/MarkAllReadButton";
import {
  markAllNotificationsReadFn,
  updateNotificationFn,
} from "~/features/notifications/notifications.mutations";
import type { NotificationRow } from "~/features/notifications/notifications.queries";

const UPDATE_FAILED = "We couldn't update your notifications. Please try again.";

type Filter = "all" | "unread";

/** Rows land a little quicker than a page's cards: the popover is small and brief. */
const ROW_CASCADE = {
  "--duration-slow": "260ms",
  "--stagger-step": "32ms",
} as CSSProperties;

interface NotificationsPopoverProps {
  /** Keys the cache, so a list is never shown to a different signed-in person. */
  userId: string;
  /** The true unread total (from the layout), which can exceed what the list holds. */
  unreadCount: number;
}

/**
 * The applicant's bell. Opens a short feed in place so a quick check doesn't
 * cost a page change; "See all notifications" goes to the full page.
 *
 * The list isn't loaded with the page. Hovering or focusing the bell warms the
 * cache, and the cache (see notification-preview-cache) decides whether that,
 * or opening, costs a request at all.
 */
export function NotificationsPopover({ userId, unreadCount }: NotificationsPopoverProps) {
  const [open, setOpen] = useState(false);
  // Set once "All" has more than the popup can show. From then on the popup
  // keeps its full height on either tab, so switching to a short "Unread" list
  // does not pull the bottom edge (and the footer) up and then back down.
  const [full, setFull] = useState(false);
  const markFull = useCallback(() => setFull(true), []);
  const hasUnread = unreadCount > 0;
  const warm = () => void ensureNotificationPreview(userId);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFull(false);
      }}
    >
      <PopoverTrigger
        onPointerEnter={warm}
        onFocus={warm}
        aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="group/bell civic-press relative flex size-11 shrink-0 md:size-12.5 items-center justify-center rounded-full border border-border-light bg-card text-portal-ink-2 outline-none hover:bg-primary-tint focus-visible:ring-[3px] focus-visible:ring-ring/50 data-popup-open:border-primary-soft data-popup-open:bg-primary-soft data-popup-open:text-primary"
      >
        <Bell className="size-5" aria-hidden="true" />
        {/* The ring is the bell's own fill, so the dot stays cut out of it. */}
        {hasUnread && (
          <span
            className="absolute top-2.75 right-3 size-2.25 rounded-full bg-brand-gold ring-2 ring-white group-data-[popup-open]/bell:ring-primary-soft md:top-3 md:right-3.25 md:size-2.5"
            aria-hidden="true"
          />
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        // Always under the bell. By default the positioner may put a popup that
        // does not fit below it on another side, and a long "All" list that
        // fits on one side and a short "Unread" one on another made the whole
        // popup jump between tabs. The list scrolls inside the room there is.
        collisionAvoidance={{ side: "none", align: "shift", fallbackAxisSide: "none" }}
        // Tops out at 35rem (about four rows and a peek of the fifth) so the
        // popup never takes the whole screen. The list scrolls inside it, and
        // a short window still shrinks to fit its content.
        className={cn(
          "flex max-h-[min(35rem,calc(100vh-100px),var(--available-height))] w-[min(26.25rem,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden rounded-panel border-0 bg-card p-0 shadow-portal-popover ring-0 duration-200 ease-(--ease-civic-emphasized) data-closed:duration-150",
          full && "h-[min(35rem,calc(100vh-100px),var(--available-height))]",
        )}
      >
        <PopoverBody
          userId={userId}
          unreadCount={unreadCount}
          close={() => setOpen(false)}
          onFull={markFull}
        />
      </PopoverContent>
    </Popover>
  );
}

function PopoverBody({
  userId,
  unreadCount,
  close,
  onFull,
}: NotificationsPopoverProps & { close: () => void; onFull: () => void }) {
  const router = useRouter();
  const preview = useNotificationPreview();
  const [filter, setFilter] = useState<Filter>("all");
  // The popup only mounts while open, so this is read fresh each time it opens.
  const now = Date.now();

  const { items, failed, stale, loading } = preview;
  const noItems = items === null;

  // Runs when the popover opens and whenever the cache is flagged stale while
  // it is open. `ensure…` is a no-op while the cache is fresh, a request is in
  // flight, or a recent attempt failed, so none of these re-runs can loop and
  // opening an already-loaded list costs nothing. `loading` is a dependency so
  // a revalidation that was superseded mid-flight is picked up again.
  useEffect(() => {
    void ensureNotificationPreview(userId);
  }, [userId, stale, loading, noItems]);

  // The sidebar badge and bell dot come from the layout loader. After a write,
  // refresh only that layout (one count query), not every loader on the page.
  const refreshCount = useCallback(
    () => router.invalidate({ filter: (match) => match.routeId === "/_authed/_dashboard" }),
    [router],
  );

  const markRead = useCallback(
    async (notification: NotificationRow) => {
      const ok = await updateNotificationPreview(
        userId,
        (rows) => rows.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
        async () => {
          const result = await updateNotificationFn({
            data: { notificationId: notification.id, action: "read" },
          });
          if (result.error) toast.error(result.message ?? UPDATE_FAILED);
          return !result.error;
        },
      );
      if (ok) void refreshCount();
    },
    [userId, refreshCount],
  );

  function handleOpen(notification: NotificationRow) {
    close();
    if (!notification.isRead) void markRead(notification);
  }

  async function markAllRead() {
    const ok = await updateNotificationPreview(
      userId,
      (rows) => rows.map((n) => (n.isRead ? n : { ...n, isRead: true })),
      async () => {
        const result = await markAllNotificationsReadFn();
        if (result.error) toast.error(result.message ?? UPDATE_FAILED);
        return !result.error;
      },
    );
    if (ok) void refreshCount();
  }

  const unreadItems = items?.filter((n) => !n.isRead) ?? [];
  // Until the list loads, the layout's count is the best answer.
  const hasUnread = items ? unreadItems.length > 0 : unreadCount > 0;
  const visible = filter === "unread" ? unreadItems : (items ?? []);

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5.5 pb-3.5">
        <h2 className="text-[26px] leading-none font-semibold tracking-[-0.02em] text-foreground">
          Notifications
        </h2>
        <MarkAllReadButton
          hasUnread={hasUnread}
          onClick={() => void markAllRead()}
          className="h-9 px-4 text-sm"
        />
      </div>

      <div
        role="group"
        aria-label="Filter notifications"
        className="flex shrink-0 gap-2 px-6"
      >
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "civic-press h-9.5 rounded-full px-4.5 text-[15px] font-semibold transition-colors",
              filter === value
                ? "bg-primary-soft text-primary"
                : "text-body-2 hover:bg-foreground/4 hover:text-foreground",
            )}
          >
            {value === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      {/* Only "All" says whether the popup is full: "Unread" is short by nature. */}
      <FeedScroller onOverflow={filter === "all" ? onFull : undefined}>
        {items === null ? (
          failed ? (
            <LoadFailed onRetry={() => void ensureNotificationPreview(userId, { force: true })} />
          ) : (
            <FeedSkeleton />
          )
        ) : (
          <FeedGroups
            items={visible}
            now={now}
            filter={filter}
            onOpen={handleOpen}
          />
        )}
      </FeedScroller>

      <div className="shrink-0 px-4 pt-2.5 pb-3">
        <QuietLink
          to="/notifications"
          onClick={close}
          className="civic-press flex h-12.5 items-center justify-center rounded-full bg-muted text-[15px] font-semibold text-foreground hover:bg-border-light"
        >
          See all notifications
        </QuietLink>
      </div>
    </>
  );
}

/**
 * The scrolling region between the header and the footer. Scrolling stays
 * inside it (no chaining into the page), the scrollbar is thin, and a soft
 * shadow appears on whichever edge has more content past it — so the list
 * reads as continuing, without a hard rule when it doesn't.
 */
function FeedScroller({
  children,
  onOverflow,
}: {
  children: ReactNode;
  /** Called whenever the list is taller than the room it has. */
  onOverflow?: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    if (top || bottom) onOverflow?.();
    // Same values return the same object, so scrolling re-renders only when an
    // edge actually changes.
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, [onOverflow]);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (scrollerRef.current) observer.observe(scrollerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="relative mt-2 flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        onScroll={measure}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin [scrollbar-color:var(--border-light)_transparent]"
      >
        <div ref={contentRef} className="pb-2">
          {children}
        </div>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 h-4 bg-linear-to-b from-foreground/[0.07] to-transparent transition-opacity duration-150",
          edges.top ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20 h-4 bg-linear-to-t from-foreground/[0.07] to-transparent transition-opacity duration-150",
          edges.bottom ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

/** Same silhouette as a row, so the list doesn't jump when the real one lands. */
function FeedSkeleton() {
  return (
    <div role="status" aria-label="Loading notifications">
      <ul aria-hidden="true" className="flex flex-col gap-1 px-3 pt-3">
        {[0, 1, 2, 3].map((index) => (
          <li key={index} className="flex items-center gap-3.5 rounded-2xl px-3 py-3">
            <span className="civic-skeleton size-11.5 shrink-0 rounded-full" />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="civic-skeleton block h-3 w-2/5 rounded-full" />
              <span className="civic-skeleton block h-4 w-4/5 rounded-full" />
              <span className="civic-skeleton block h-3 w-1/4 rounded-full" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
      <p className="text-[17px] font-bold text-foreground">Couldn't load notifications</p>
      <p className="text-[15px] text-body-2">Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="civic-press mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-primary-soft px-5 text-[15px] font-bold text-primary hover:bg-primary-soft/70"
      >
        <RotateCw className="size-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

function FeedGroups({
  items,
  now,
  filter,
  onOpen,
}: {
  items: NotificationRow[];
  now: number;
  filter: Filter;
  onOpen: (notification: NotificationRow) => void;
}) {
  if (items.length === 0) {
    const caughtUp = filter === "unread";
    return (
      <div className="civic-enter-fade flex flex-col items-center gap-1 px-6 py-12 text-center">
        <span
          className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <Bell className="size-5.5" />
        </span>
        <p className="text-[17px] font-bold text-foreground">
          {caughtUp ? "You're all caught up" : "No notifications yet"}
        </p>
        <p className="text-[15px] text-body-2">
          {caughtUp
            ? "New updates will show up here."
            : "Updates on your requests will show up here."}
        </p>
      </div>
    );
  }

  const fresh = items.filter((n) => !n.isRead);
  const earlier = items.filter((n) => n.isRead);

  return (
    <>
      {fresh.length > 0 ? (
        <FeedGroup label="New" items={fresh} start={0} now={now} onOpen={onOpen} />
      ) : null}
      {earlier.length > 0 ? (
        <FeedGroup
          label="Earlier"
          items={earlier}
          start={fresh.length}
          now={now}
          onOpen={onOpen}
        />
      ) : null}
    </>
  );
}

function FeedGroup({
  label,
  items,
  start,
  now,
  onOpen,
}: {
  label: string;
  items: NotificationRow[];
  /** Row number of this group's first row, so the entrance cascades through both groups. */
  start: number;
  now: number;
  onOpen: (notification: NotificationRow) => void;
}) {
  return (
    <section aria-label={label}>
      {/* Sticks to the top while its rows scroll beneath, on a solid ground (a
          blur would cost scroll smoothness on low-end phones). */}
      <h3 className="sticky top-0 z-10 bg-card px-6.5 pt-2.5 pb-1.5 text-[15px] font-semibold text-muted-foreground">
        {label}
      </h3>
      <ul className="civic-stagger flex flex-col gap-1 px-3" style={ROW_CASCADE}>
        {items.map((notification, index) => (
          <li key={notification.id} style={staggerStyle(start + index)}>
            <FeedRow notification={notification} now={now} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FeedRow({
  notification,
  now,
  onOpen,
}: {
  notification: NotificationRow;
  now: number;
  onOpen: (notification: NotificationRow) => void;
}) {
  const { icon: TypeIcon, unreadClass } = TYPE_STYLE[notification.type] ?? TYPE_STYLE.status_change;
  const unread = !notification.isRead;
  const detail = unread ? feedDetail(notification) : null;

  return linkFor(notification.target, () => onOpen(notification), {
    className: cn(
      "civic-interactive flex items-start gap-3.5 rounded-[18px] p-3",
      unread ? "bg-primary-tint" : "hover:bg-foreground/3",
    ),
    children: (
      <>
        <span
          className={cn(
            "flex size-11.5 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
            unread ? unreadClass : "bg-muted text-muted-foreground",
          )}
          aria-hidden="true"
        >
          <TypeIcon className="size-5.25" />
        </span>

        <span className="min-w-0 flex-1">
          {notification.serviceName ? (
            <span
              className={cn(
                "block truncate text-[13.5px] leading-snug font-semibold",
                unread ? "text-primary" : "text-muted-foreground",
              )}
            >
              {notification.serviceName}
            </span>
          ) : null}
          <span
            className={cn(
              "mt-px block text-[15.5px] leading-[1.3] text-foreground",
              unread ? "font-bold" : "font-medium",
            )}
          >
            {unread ? <span className="sr-only">Unread: </span> : null}
            {feedTitle(notification.subject)}
          </span>
          {detail ? (
            <span className="mt-0.5 line-clamp-2 block text-[14px] leading-[1.35] text-body-2">
              {detail}
            </span>
          ) : null}
          <time
            dateTime={notification.sentAt}
            className={cn(
              "mt-1 block text-[13px] leading-snug",
              unread ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            {feedWhen(notification.sentAt, now)}
          </time>
        </span>

        {/* Lined up with the middle of the 46px circle beside it. */}
        {unread ? (
          <span className="mt-4.25 size-3 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        ) : null}
      </>
    ),
  });
}
