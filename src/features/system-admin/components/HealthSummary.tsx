import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, History, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { healthStatusContent } from "../system-health.constants";
import type { SystemHealthDashboard } from "../system-admin.types";
import {
  formatHealthCount,
  formatHealthPercent,
  formatResponseTime,
} from "../system-health.utils";

function SummaryMetric({
  label,
  value,
  detail,
  marker,
  icon: Icon,
  numeric = true,
  className,
}: {
  label: string;
  value: string;
  detail: string;
  marker?: ReactNode;
  icon: LucideIcon;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4 border-border p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </div>
        {marker ? <div className="shrink-0">{marker}</div> : null}
      </div>
      <div>
        <p
          className={cn(
            "text-2xl font-semibold tracking-tight text-foreground",
            numeric && "font-mono tabular-nums",
          )}
        >
          {value}
        </p>
        <p className="mt-1.5 max-w-xs text-pretty text-xs leading-5 text-muted-foreground">
          {detail}
        </p>
      </div>
    </div>
  );
}

export function HealthSummary({ data }: { data: SystemHealthDashboard }) {
  const responseTimes = data.services
    .map((service) => service.responseTimeMs)
    .filter((value): value is number => value !== null);
  const slowestResponse =
    responseTimes.length > 0 ? Math.max(...responseTimes) : null;
  const overall = healthStatusContent[data.overallStatus];

  return (
    <section
      id="system-health-content"
      tabIndex={-1}
      className="scroll-mt-6 rounded-xl focus-visible:ring-2 focus-visible:ring-ring"
      aria-labelledby="health-summary-title"
    >
      <Card size="sm">
        <CardHeader className="sr-only">
          <CardTitle>
            <h2 id="health-summary-title">Health Summary</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="civic-stagger-auto grid p-0 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric
            label="Platform State"
            value={overall.label}
            detail="Worst current state across every monitored service and signal."
            icon={ShieldCheck}
            numeric={false}
            className="border-b sm:border-r xl:border-b-0"
          />
          <SummaryMetric
            label="24-Hour Availability"
            value={formatHealthPercent(data.availabilityPercent)}
            detail="Average of stored metadata-only service checks."
            marker={<Badge variant="outline">Rolling 24h</Badge>}
            icon={History}
            className="border-b xl:border-r xl:border-b-0"
          />
          <SummaryMetric
            label="Slowest Response"
            value={formatResponseTime(slowestResponse)}
            detail="Highest response time from the latest service probes."
            marker={<Badge variant="outline">Latest check</Badge>}
            icon={Activity}
            className="border-b sm:border-r sm:border-b-0"
          />
          <SummaryMetric
            label="Active Degradations"
            value={formatHealthCount(data.activeDegradations)}
            detail="Live checks, workload signals, and unresolved operational events."
            icon={TriangleAlert}
          />
        </CardContent>
      </Card>
    </section>
  );
}
