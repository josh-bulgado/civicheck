import { ArrowRight } from "lucide-react";
import type { AdminDashboardData } from "../dashboard.types";

const PIPELINE_META = [
  { key: "intake", label: "Intake" },
  { key: "validation", label: "Validation" },
  { key: "processing", label: "Processing" },
  { key: "approval", label: "Approval" },
  { key: "release", label: "Release" },
] as const;

export function PipelinePanel({
  pipeline,
}: Pick<AdminDashboardData, "pipeline">) {
  const max = Math.max(1, ...PIPELINE_META.map(({ key }) => pipeline[key]));

  return (
    <section className="dashboard-panel p-5 sm:p-6" aria-labelledby="pipeline-heading">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="civic-eyebrow mb-1">Request flow</p>
          <h2 id="pipeline-heading" className="text-xl font-bold tracking-tight">
            Active pipeline
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Released and rejected requests excluded
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {PIPELINE_META.map(({ key, label }, index) => {
          const value = pipeline[key];
          return (
            <div key={key} className="relative rounded-lg border border-border bg-surface-subtle p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
                <span className="text-xl font-extrabold tabular-nums">{value}</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${value === 0 ? 0 : Math.max(8, (value / max) * 100)}%` }}
                />
              </div>
              {index < PIPELINE_META.length - 1 ? (
                <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full border border-border bg-white p-1 text-muted-foreground sm:block" />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
