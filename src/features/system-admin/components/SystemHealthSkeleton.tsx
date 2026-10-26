import { Skeleton } from "~/components/ui/skeleton";

/** Match the overview's heading, metrics strip, service table and insight cards. */
export function SystemHealthSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading system health">
      <div className="flex min-h-18 items-center gap-5">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <Skeleton className="h-10 w-72 max-w-full rounded-lg" />
      </div>
      <Skeleton className="h-[138px] rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.12fr)_minmax(340px,1fr)]">
        <Skeleton className="h-[552px] rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
