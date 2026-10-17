import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

/**
 * Everything under the title row, as a silhouette, in the same flex column the
 * real content uses so the swap moves nothing.
 *
 * `prominent` is the applicant with no requests yet: the blue "what do you
 * need" card and four tall document tiles that fill the rest of the page.
 * Otherwise it is the hero card with the slim tile row under it.
 */
export function CitizenDashboardBodySkeleton({
  prominent = false,
  className,
}: {
  prominent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 flex-col gap-4.5 md:gap-5", className)}>
      <span role="status" className="sr-only">
        Loading your dashboard…
      </span>
      {prominent ? (
        <>
          <Skeleton className="h-72 rounded-hero md:h-56" />
          <div className="flex gap-3 overflow-hidden max-md:-mx-5 max-md:px-5 md:grid md:flex-1 md:auto-rows-[minmax(7rem,1fr)] md:grid-cols-2 md:gap-5 xl:auto-rows-[minmax(12.5rem,1fr)] xl:grid-cols-4">
            {[0, 1, 2, 3].map((tile) => (
              <Skeleton
                key={tile}
                className="rounded-[28px] max-md:h-47.5 max-md:w-39.5 max-md:shrink-0 max-md:rounded-4xl"
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <Skeleton className="h-64 rounded-hero md:h-72" />
          <div className="grid auto-rows-[5rem] grid-cols-2 gap-3 md:auto-rows-[6rem] md:grid-cols-4 md:gap-4">
            {[0, 1, 2, 3].map((tile) => (
              <Skeleton key={tile} className="rounded-4xl" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** The whole dashboard while the route's own data loads: title row, then the body. */
export function CitizenDashboardSkeleton() {
  return (
    <div className="portal-page flex-1 gap-4.5 md:gap-5" aria-busy="true">
      <div className="flex items-center justify-between gap-6">
        <Skeleton className="h-10 w-72 max-w-full rounded-xl" />
        <Skeleton className="hidden h-12 w-36 rounded-full md:block" />
      </div>
      <CitizenDashboardBodySkeleton />
    </div>
  );
}
