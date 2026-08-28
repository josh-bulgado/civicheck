import { Skeleton } from "~/components/ui/skeleton";

export function AdminReportsSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading CCRO operational reports…">
      <Skeleton className="h-56 rounded-2xl" />
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-16 w-52 rounded-xl" />
        <Skeleton className="h-16 w-72 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-96 rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
