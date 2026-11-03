import { Skeleton } from "~/components/ui/skeleton";

export function StaffDashboardSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading dashboard…">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-72 max-w-full rounded-lg" />
        <Skeleton className="h-5 w-96 max-w-full rounded-md" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-[20px]" />
        <Skeleton className="h-64 rounded-[20px]" />
        <Skeleton className="h-64 rounded-[20px]" />
      </div>
    </div>
  );
}
