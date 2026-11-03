import { Skeleton } from "~/components/ui/skeleton";

/** The request page's own silhouette: header, blue card, history, side cards. */
export function MyRequestDetailPageSkeleton() {
  return (
    <div className="portal-page gap-6 md:gap-7" aria-label="Loading your request…">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40 rounded-md" />
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-10 w-80 max-w-full rounded-xl" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 md:gap-7 lg:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="flex flex-col gap-6 md:gap-7">
          <Skeleton className="h-64 rounded-hero" />
          <Skeleton className="h-72 rounded-[28px]" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-64 rounded-[28px]" />
          <Skeleton className="h-52 rounded-[28px]" />
          <Skeleton className="h-28 rounded-[28px]" />
        </div>
      </div>
    </div>
  );
}
