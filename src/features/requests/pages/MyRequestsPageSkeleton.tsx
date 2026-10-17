import { Skeleton } from "~/components/ui/skeleton";

export function MyRequestsPageSkeleton() {
  return (
    <div className="portal-page gap-5 md:gap-7" aria-label="Loading your requests…">
      <div className="flex items-center justify-between gap-6">
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-14 w-44 rounded-full" />
      </div>
      <div className="flex flex-col gap-6 md:gap-7">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-28 rounded-[28px]" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-60 rounded-[28px]" />
        </div>
      </div>
    </div>
  );
}
