import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export function StaffDashboardSkeleton() {
  return (
    <div className="dashboard-page" aria-label="Loading dashboard…">
      <div className="flex flex-col gap-2">
        <h1 className="text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Staff Dashboard</h1>
        <Skeleton className="h-5 w-96 max-w-full rounded-md" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {[{ title: "Longest Wait on You", height: "h-80" }, { title: "Your Queue by Stage", height: "h-80" }, { title: "Then", height: "h-64" }, { title: "Not Your Move", height: "h-64" }].map(({ title, height }) => (
          <section key={title} className={cn("flex min-w-0 flex-col gap-4 rounded-[20px] border border-border-light bg-card p-5", height)}>
            <h2 className="text-lg font-bold">{title}</h2>
            <Skeleton className="min-h-0 flex-1 rounded-xl" />
          </section>
        ))}
      </div>
    </div>
  );
}
