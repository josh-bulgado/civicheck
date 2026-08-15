import { ClipboardCheck } from "lucide-react";
import type { AdminDashboardData } from "../dashboard.types";
import { EmptyState } from "./DashboardPanelPrimitives";

export function ServiceDemandPanel({
  serviceDemand,
}: Pick<AdminDashboardData, "serviceDemand">) {
  const max = Math.max(1, ...serviceDemand.map((item) => item.count));

  return (
    <section className="dashboard-panel p-5 sm:p-6" aria-labelledby="demand-heading">
      <p className="civic-eyebrow mb-1">Trailing 30 days</p>
      <h2 id="demand-heading" className="text-xl font-bold tracking-tight">
        Most requested services
      </h2>
      {serviceDemand.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No recent demand"
          description="Service rankings will appear after requests are submitted."
          compact
        />
      ) : (
        <ol className="mt-6 space-y-4">
          {serviceDemand.map((item, index) => (
            <li key={item.serviceName}>
              <div className="mb-1.5 flex items-start justify-between gap-4 text-sm">
                <span className="min-w-0 font-semibold">
                  <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                  {item.serviceName}
                </span>
                <span className="shrink-0 font-bold tabular-nums">{item.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
