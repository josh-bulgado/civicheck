import { Skeleton } from "~/components/ui/skeleton";

export function LandingPageSkeleton() {
  return (
    <div data-page-skeleton role="status" aria-label="Loading CiviCheck" aria-busy="true" className="landing-loading">
      <div aria-hidden="true" className="landing-header-inner">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-12 w-64 max-w-[45%] rounded-full" />
      </div>
      <div aria-hidden="true" className="landing-hero landing-loading-hero">
        <div className="landing-hero-content">
          <div className="space-y-5">
            <Skeleton className="h-16 w-3/5" />
            <Skeleton className="h-16 w-4/5" />
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-3 pt-5">
              <Skeleton className="h-14 w-56 rounded-full" />
              <Skeleton className="h-14 w-48 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-96 w-full max-w-108 justify-self-center rounded-[28px]" />
        </div>
      </div>
      <Skeleton aria-hidden="true" className="landing-process h-80" />
    </div>
  );
}
