import { Skeleton } from "~/components/ui/skeleton";
import { PageHeaderCard } from "~/components/ui/page-header-card";

export function AdminReportsSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading CCRO operational reports…">
      <PageHeaderCard title="Reports" description="CCRO Administration" />
      <div className="flex flex-wrap gap-4 text-sm font-semibold text-muted-foreground"><span>Briefing</span><span>Services</span><span>Report Sheet</span></div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
