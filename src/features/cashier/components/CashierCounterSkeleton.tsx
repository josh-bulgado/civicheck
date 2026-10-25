import {
  SkeletonHeading,
  PanelSkeleton,
} from "~/components/feedback/PageSkeleton";
import { Skeleton } from "~/components/ui/skeleton";

export function CashierCounterSkeleton() {
  return (
    <div
      data-page-skeleton
      role="status"
      aria-label="Loading cashier counter"
      aria-busy="true"
      className="dashboard-page min-w-0"
    >
      <SkeletonHeading />
      <div
        aria-hidden="true"
        className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]"
      >
        <div className="space-y-5 rounded-2xl border border-border-strong bg-card p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16 w-full rounded-xl" />
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="space-y-2 border-t border-border-light pt-4"
            >
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="rounded-2xl border border-border-strong bg-card p-6">
            <PanelSkeleton label="Loading payment details" rows={4} />
          </div>
        </div>
      </div>
    </div>
  );
}
