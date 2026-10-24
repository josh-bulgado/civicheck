import { Skeleton } from "~/components/ui/skeleton";

/** The page's own shape: title, tabs, verdict, then the components list beside the side cards. */
export function SystemHealthSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading system health">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="h-5 w-96 max-w-full rounded-lg" />
      </div>
      <Skeleton className="h-9 w-72 rounded-lg" />
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <Skeleton className="h-[34rem] rounded-[20px]" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-60 rounded-[20px]" />
          <Skeleton className="h-28 rounded-[20px]" />
          <Skeleton className="h-32 rounded-[20px]" />
        </div>
      </div>
    </div>
  );
}
