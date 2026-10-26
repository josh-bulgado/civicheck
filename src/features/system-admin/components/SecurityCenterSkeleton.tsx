import { Skeleton } from "~/components/ui/skeleton";
import "../security-center.css";

export function SecurityCenterSkeleton() {
  return (
    <div
      className="dashboard-page security-center-page"
      aria-label="Loading Security Center"
    >
      <div className="security-page-header">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>
      <Skeleton className="h-32 rounded-[21px]" />
      <Skeleton className="h-11 w-full max-w-xl rounded-full" />
      <Skeleton className="h-96 rounded-[21px]" />
    </div>
  );
}
