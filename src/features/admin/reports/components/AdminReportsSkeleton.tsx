import { Skeleton } from "~/components/ui/skeleton";

export function AdminReportsSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading CCRO operational reports…">
      <Skeleton className="h-[4.5rem] rounded-xl" />
      <Skeleton className="h-10 w-80 rounded-lg" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
