import { Skeleton } from "~/components/ui/skeleton";

export function LandingPageSkeleton() {
  return (
    <div
      data-page-skeleton
      role="status"
      aria-label="Loading CiviCheck"
      aria-busy="true"
      className="mx-auto min-w-0 w-full max-w-7xl space-y-12 px-5 py-6 sm:px-8"
    >
      <div
        aria-hidden="true"
        className="flex items-center justify-between gap-6"
      >
        <Skeleton className="h-11 w-44" />
        <Skeleton className="h-11 w-64 max-w-[45%] rounded-full" />
      </div>
      <div
        aria-hidden="true"
        className="grid items-center gap-10 py-8 lg:grid-cols-2"
      >
        <div className="space-y-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-4/5" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <div className="flex gap-4">
            <Skeleton className="h-12 w-44 rounded-xl" />
            <Skeleton className="h-12 w-36 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-96 rounded-[32px]" />
      </div>
      <div aria-hidden="true" className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
