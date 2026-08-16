import { Skeleton } from "~/components/ui/skeleton";

export function AdminOverviewSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading CCRO operations overview…">
      <Skeleton className="h-56 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
