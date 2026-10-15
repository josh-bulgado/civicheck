import { Skeleton } from "~/components/ui/skeleton";
import type { NotificationAudience } from "~/features/notifications/notification-audience";

const ROWS = [0, 1, 2, 3];

/** One applicant row: type icon, service name, title, and the time at the right. */
function PortalRowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-5 py-5 max-md:items-start max-md:gap-3.5 max-md:px-4.5 max-md:py-4 @3xl:gap-5 @3xl:px-8 @3xl:py-6">
      <Skeleton className="size-13 shrink-0 rounded-full max-md:size-11" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <Skeleton className="h-3.5 w-1/4 rounded-full" />
        <Skeleton className="h-5 w-3/5 rounded-full" />
        <Skeleton className="h-4 w-4/5 rounded-full" />
      </div>
      <Skeleton className="h-4 w-14 shrink-0 rounded-full max-md:hidden" />
    </li>
  );
}

/** The applicant's feed: title and "Mark all read", then a labelled card of rows. */
function PortalSkeleton() {
  return (
    <div className="portal-page gap-4.5 md:gap-7" aria-label="Loading your notifications…">
      <div className="flex items-center justify-between gap-x-6 gap-y-3">
        <Skeleton className="h-10 w-52 rounded-xl md:h-12" />
        <Skeleton className="h-10 w-32 rounded-full md:h-12 md:w-44" />
      </div>
      <div className="@container flex flex-col gap-6 md:gap-7">
        <section className="flex flex-col gap-2.5 md:gap-3">
          <Skeleton className="ml-1 h-4 w-14 rounded-md" />
          <ul className="divide-y divide-border-lighter overflow-hidden rounded-4xl bg-card shadow-portal-card md:rounded-[28px]">
            {ROWS.map((row) => (
              <PortalRowSkeleton key={row} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** One staff row: icon tile, subject, body, and the tracking number line. */
function StaffRowSkeleton() {
  return (
    <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <Skeleton className="h-4 w-1/2 rounded-full" />
        <Skeleton className="h-4 w-4/5 rounded-full" />
        <Skeleton className="h-3 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

/** The CCRO feed: hero, the All / Unread / Archived tabs, then a day group. */
function StaffSkeleton() {
  return (
    <div className="dashboard-page max-w-4xl" aria-label="Loading notifications…">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <section>
        <Skeleton className="mb-2 ml-2 h-3 w-16 rounded-full" />
        <div className="dashboard-panel divide-y divide-border-lighter overflow-hidden">
          {ROWS.map((row) => (
            <StaffRowSkeleton key={row} />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * What stands in for /notifications while its loader runs. The two feeds are
 * laid out differently, so each audience gets the silhouette of its own page.
 */
export function NotificationsPageSkeleton({
  audience,
}: {
  audience: NotificationAudience;
}) {
  return audience === "applicant" ? <PortalSkeleton /> : <StaffSkeleton />;
}
