import { Skeleton } from "~/components/ui/skeleton";

export function RequestsPageSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading requests…">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
