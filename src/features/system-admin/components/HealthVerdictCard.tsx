import { CircleDashed, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { healthVerdict, type VerdictTone } from "../system-health.model";
import { formatHealthPercent, formatResponseTime } from "../system-health.utils";
import type { SystemHealthDashboard } from "../system-admin.types";
import { HealthStatusBadge } from "./HealthStatusBadge";

const tones: Record<VerdictTone, { wash: string; tile: string; icon: LucideIcon }> = {
  ok: {
    wash: "bg-linear-to-b from-health-success-bg to-card",
    tile: "bg-health-success-dot text-card",
    icon: ShieldCheck,
  },
  warn: {
    wash: "bg-linear-to-b from-health-warning-bg to-card",
    tile: "bg-health-warning-dot text-card",
    icon: TriangleAlert,
  },
  err: {
    wash: "bg-linear-to-b from-health-error-bg to-card",
    tile: "bg-health-error-dot text-card",
    icon: TriangleAlert,
  },
  neutral: {
    wash: "bg-linear-to-b from-health-neutral-bg to-card",
    tile: "bg-health-neutral-dot text-card",
    icon: CircleDashed,
  },
};

/** The first thing on the page: what the platform is doing, in a sentence, with the three figures behind it. */
export function HealthVerdictCard({ data }: { data: SystemHealthDashboard }) {
  const verdict = healthVerdict(data);
  const tone = tones[verdict.tone];
  const Icon = tone.icon;

  const stats = [
    {
      label: "Availability",
      value: data.availabilityPercent === null ? "No data" : formatHealthPercent(data.availabilityPercent),
      note: "24h, by time",
    },
    {
      label: "Slowest",
      value: data.slowest ? formatResponseTime(data.slowest.responseMs) : "No data",
      note: data.slowest?.name ?? "No checks yet",
    },
    {
      label: "Active",
      value: String(data.activeCount),
      note: data.activeCount === 1 ? "Incident" : "Incidents",
    },
  ];

  return (
    <Card variant="lifted" className={cn("justify-center", tone.wash)} aria-labelledby="health-verdict-title" role="region">
      <CardContent className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex items-start gap-4">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", tone.tile)}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div aria-live="polite" className="flex min-w-0 flex-col items-start gap-1.5">
            <HealthStatusBadge status={data.overallStatus} />
            <h2 id="health-verdict-title" className="text-balance text-2xl font-bold tracking-[-0.02em]">
              {verdict.title}
            </h2>
            <p className="max-w-prose text-base text-pretty text-muted-foreground">{verdict.body}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-border/60 max-sm:grid-cols-1 max-sm:divide-x-0 max-sm:gap-3">
          {stats.map(({ label, value, note }) => (
            <div key={label} className="flex flex-col gap-0.5 px-4 first:pl-0 max-sm:px-0">
              <dt className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
              <dd className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
              <dd className="text-sm text-muted-foreground">{note}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
