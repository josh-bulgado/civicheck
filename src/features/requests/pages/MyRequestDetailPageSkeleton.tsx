import { Skeleton } from "~/components/ui/skeleton";

/** Match progress/documents on the left and details/history on the right. */
export function MyRequestDetailPageSkeleton() {
  return (
    <div className="portal-page gap-5 md:gap-6" aria-label="Loading your request…" role="status">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40 rounded-md" />
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <Skeleton className="h-10 w-80 max-w-full rounded-xl" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
          <Skeleton className="h-10 w-28 shrink-0 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="flex flex-col gap-5 md:gap-6">
          <Skeleton className="h-80 rounded-3xl" />
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <Skeleton className="h-72 rounded-3xl" />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <Skeleton className="h-96 rounded-3xl" />
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          <Skeleton className="h-36 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
