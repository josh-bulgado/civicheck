import { Skeleton } from "~/components/ui/skeleton";

export function AdminOverviewSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading CCRO operations overview…">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6 xl:col-start-1 xl:row-start-1">
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-[34rem] rounded-2xl xl:col-start-2 xl:row-span-2 xl:row-start-1" />
        <div className="grid gap-4 md:grid-cols-2 xl:col-start-1 xl:row-start-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
