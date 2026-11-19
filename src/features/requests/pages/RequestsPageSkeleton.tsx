import { Skeleton } from "~/components/ui/skeleton";
import { PageHeaderCard } from "~/components/ui/page-header-card";

export function RequestsPageSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading requests…">
      {/* The header card, then the one card holding toolbar, table and footer. */}
      <PageHeaderCard title="Request Queue" description={<Skeleton aria-hidden="true" className="h-4 w-64 max-w-full" />} />
      <Skeleton className="h-[36rem] rounded-xl" />
    </div>
  );
}
