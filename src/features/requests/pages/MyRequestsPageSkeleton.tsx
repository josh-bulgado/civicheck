import { Skeleton } from "~/components/ui/skeleton";
import { MyRequestsPageHeader } from "../components/MyRequestsPageHeader";

export function MyRequestsPageSkeleton() {
  return (
    <div className="portal-page gap-4.5 md:gap-7">
      <MyRequestsPageHeader />
      <div className="flex flex-col gap-6 md:gap-7" role="status" aria-busy="true" aria-label="Loading your requests">
        <div className="flex flex-col gap-3">
          <h2 className="px-1 text-[15px] font-semibold text-muted-foreground md:px-1.5 md:text-base">In progress</h2>
          <Skeleton aria-hidden="true" className="h-28 rounded-[28px]" />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="px-1 text-[15px] font-semibold text-muted-foreground md:px-1.5 md:text-base">Completed</h2>
          <Skeleton aria-hidden="true" className="h-60 rounded-[28px]" />
        </div>
      </div>
    </div>
  );
}
