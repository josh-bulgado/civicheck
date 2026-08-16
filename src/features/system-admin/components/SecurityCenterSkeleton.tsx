import { Skeleton } from "~/components/ui/skeleton";

export function SecurityCenterSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading Security Center">
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-72 rounded-xl" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-52 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
