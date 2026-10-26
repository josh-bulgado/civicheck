import { Skeleton } from "~/components/ui/skeleton";
import "../system-health.css";

/** Match the overview's heading, metrics strip, service table and insight cards. */
export function SystemHealthSkeleton() {
  return (
    <div className="dashboard-page system-health-page" data-health-view="overview" data-health-panel="services" aria-label="Loading system health">
      <div className="health-page-header">
        <div className="space-y-2"><Skeleton className="h-9 w-60 max-w-full" /><Skeleton className="h-3 w-36" /></div>
        <Skeleton className="hidden h-9 w-96 rounded-full lg:block" />
      </div>
      <Skeleton className="h-full min-h-0 rounded-[21px]" />
      <div className="health-panel-tabs"><Skeleton className="h-full w-full rounded-full" /></div>
      <div className="health-overview-grid">
        <Skeleton className="health-services-panel h-full min-h-0 rounded-[21px]" />
        <div className="health-overview-aside">
          <Skeleton className="health-chart-panel h-full min-h-0 rounded-[21px]" />
          <Skeleton className="health-activity-panel h-full min-h-0 rounded-[21px]" />
        </div>
      </div>
    </div>
  );
}
