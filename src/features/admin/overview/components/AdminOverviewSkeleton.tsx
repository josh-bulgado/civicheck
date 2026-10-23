import { Skeleton } from "~/components/ui/skeleton";

export function AdminOverviewSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading CCRO operations overview…">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-[26rem] rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
