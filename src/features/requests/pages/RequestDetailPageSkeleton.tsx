import { Skeleton } from "~/components/ui/skeleton";

/** The staff request page's silhouette: back link, hero, details/history, actions. */
export function RequestDetailPageSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading request…">
      <Skeleton className="mb-5 h-5 w-36 rounded-md" />
      <Skeleton className="h-36 rounded-2xl" />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
