import { Skeleton } from "~/components/ui/skeleton";

/** Match progress/documents on the left and details/history on the right. */
export function MyRequestDetailPageSkeleton() {
  return (
    <div className="portal-page @container gap-5 md:gap-6" aria-label="Loading your request…" role="status">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40 rounded-md" />
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <Skeleton className="h-10 w-80 max-w-full rounded-xl" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
          <Skeleton className="h-10 w-28 shrink-0 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 md:gap-6 @4xl:grid-cols-[minmax(0,1fr)_22rem] @5xl:grid-cols-[minmax(0,1fr)_24rem] @6xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="flex flex-col gap-5 md:gap-6">
          <Skeleton className="h-80 rounded-3xl" />
        </div>
        <div className="min-w-0 @4xl:col-start-2 @4xl:row-start-1">
          <Skeleton className="h-72 rounded-3xl" />
        </div>
        <div className="min-w-0 @4xl:col-start-1 @4xl:row-start-2">
          <Skeleton className="h-96 rounded-3xl" />
        </div>
        <div className="min-w-0 @4xl:col-start-2 @4xl:row-start-2">
          <Skeleton className="h-36 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
