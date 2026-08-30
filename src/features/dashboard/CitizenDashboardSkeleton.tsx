import { Skeleton } from "~/components/ui/skeleton";

export function CitizenDashboardSkeleton() {
  return (
    <div className="dashboard-page max-w-7xl" aria-label="Loading your dashboard…">
      <Skeleton className="h-64 rounded-2xl sm:h-52" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
