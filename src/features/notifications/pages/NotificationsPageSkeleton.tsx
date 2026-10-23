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

/** One staff row: icon tile, title with its tracking number, and the body line. */
function StaffRowSkeleton() {
  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5">
      <Skeleton className="size-9 shrink-0 rounded-[10px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/5 rounded-full" />
        <Skeleton className="h-3.5 w-3/4 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-14 shrink-0 rounded-full" />
    </div>
  );
}

/** The CCRO feed: the header card, then one card with the toolbar and a day group. */
function StaffSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading notifications…">
      <Skeleton className="h-[4.5rem] rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-border-strong bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
          <Skeleton className="h-10 w-72 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
        <Skeleton className="h-8 rounded-none" />
        <div className="divide-y divide-border-lighter">
          {ROWS.map((row) => (
            <StaffRowSkeleton key={row} />
          ))}
        </div>
      </div>
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
