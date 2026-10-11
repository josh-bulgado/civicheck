import { Skeleton } from "~/components/ui/skeleton";

export function CitizenDashboardSkeleton() {
  return (
    <div className="portal-page" aria-label="Loading your dashboard…">
      <Skeleton className="h-96 rounded-2xl" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
