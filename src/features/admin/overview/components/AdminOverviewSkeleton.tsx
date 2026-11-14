import { Skeleton } from "~/components/ui/skeleton";

export function AdminOverviewSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading CCRO operations overview…">
      <div className="flex flex-col gap-2">
        <h1 className="text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Overview</h1>
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6 xl:col-start-1 xl:row-start-1">
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-[34rem] rounded-2xl xl:col-start-2 xl:row-span-2 xl:row-start-1" />
        <section className="flex min-w-0 flex-col gap-3 xl:col-start-1 xl:row-start-2">
          <h2 className="text-xl font-bold tracking-tight">Your Responsibilities</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {["People", "Services", "Insight", "Requests"].map((title) => (
              <div key={title} className="flex h-44 flex-col gap-4 rounded-2xl border border-border-light bg-card p-5">
                <h3 className="font-semibold">{title}</h3>
                <Skeleton className="min-h-0 flex-1 rounded-xl" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
