import { Skeleton } from "~/components/ui/skeleton";

export function RequestsPageSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading requests…">
      {/* The header card, then the one card holding toolbar, table and footer. */}
      <Skeleton className="h-[4.5rem] rounded-xl" />
      <Skeleton className="h-[36rem] rounded-xl" />
    </div>
  );
}
