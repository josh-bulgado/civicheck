import { Skeleton } from "~/components/ui/skeleton";

/** The staff request page's silhouette: header with its next-step band, tabs, workbench. */
export function RequestDetailPageSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading request…">
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-10 rounded-lg" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_18rem]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-[34rem] rounded-xl" />
        <Skeleton className="h-72 rounded-xl lg:col-span-2 xl:col-span-1" />
      </div>
    </div>
  );
}
