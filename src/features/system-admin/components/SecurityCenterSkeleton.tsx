import { Skeleton } from "~/components/ui/skeleton";

export function SecurityCenterSkeleton() {
  return (
    <div
      className="dashboard-page security-center-page"
      data-page-skeleton
      role="status"
      aria-busy="true"
      aria-label="Loading Security Center"
    >
      <div className="security-page-header">
        <div className="flex flex-col gap-2">
          <h1>Security Center</h1>
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <span className="security-metadata-chip">Metadata only</span>
      </div>
      <Skeleton className="h-32 rounded-[21px]" />
      <div className="flex flex-wrap gap-4 text-sm font-semibold text-muted-foreground">
        <span>Findings</span><span>Privileged access</span><span>Recent activity</span><span>Controls</span>
      </div>
      <Skeleton className="h-96 rounded-[21px]" />
    </div>
  );
}
