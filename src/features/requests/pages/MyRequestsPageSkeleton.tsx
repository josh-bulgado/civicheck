import { Skeleton } from "~/components/ui/skeleton";

export function MyRequestsPageSkeleton() {
  return (
    <div className="portal-page" aria-label="Loading your requests…">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
