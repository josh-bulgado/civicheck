import { Skeleton } from "~/components/ui/skeleton";

export function MyRequestDetailPageSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading your request…">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </div>
  );
}
