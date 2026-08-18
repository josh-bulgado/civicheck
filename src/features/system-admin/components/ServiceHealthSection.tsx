import { Database, HardDrive, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type {
  HealthStatus,
  HealthTrendPoint,
  ServiceHealth,
} from "../system-admin.types";
import {
  formatHealthPercent,
  formatHealthTimestamp,
  formatResponseTime,
} from "../system-health.utils";
import { HealthSectionHeader } from "./HealthSectionHeader";
import { HealthStatusBadge } from "./HealthStatusBadge";

const serviceIcons = {
  database: Database,
  authentication: LockKeyhole,
  storage: HardDrive,
} as const;

const trendStroke: Record<HealthStatus, string> = {
  operational: "stroke-health-success-dot",
  degraded: "stroke-health-warning-dot",
  outage: "stroke-health-error-dot",
  unknown: "stroke-health-neutral-dot",
};

function HealthTrend({
  points,
  label,
  status,
}: {
  points: HealthTrendPoint[];
  label: string;
  status: HealthStatus;
}) {
  const values = points
    .map((point) => point.responseTimeMs)
    .filter((value): value is number => value !== null);

  if (values.length < 2) {
    return (
      <p className="flex h-10 items-center text-xs text-muted-foreground">
        Trend begins after the next check.
      </p>
    );
  }

  const max = Math.max(...values, 1);
  const coordinates = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 120;
      const y = 29 - (value / max) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 120 32"
      className="h-10 w-full"
      role="img"
      aria-label={`${label} response-time trend over the last 24 hours`}
      preserveAspectRatio="none"
    >
      <path d="M0 29.5H120" className="stroke-border" strokeWidth="1" />
      <polyline
        points={coordinates}
        pathLength={1}
        fill="none"
        className={cn("civic-draw-line", trendStroke[status])}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ServiceHealthCard({ service }: { service: ServiceHealth }) {
  const Icon = serviceIcons[service.key];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Icon className="size-4 text-primary" aria-hidden="true" />
            {service.name}
          </h3>
        </CardTitle>
        <CardDescription className="text-pretty">
          {service.description}
        </CardDescription>
        <CardAction>
          <HealthStatusBadge status={service.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["Response", formatResponseTime(service.responseTimeMs)],
            ["24h Uptime", formatHealthPercent(service.availabilityPercent)],
            ["Error Rate", formatHealthPercent(service.errorRatePercent)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 border-l border-border pl-3 first:border-l-0 first:pl-0"
            >
              <dt className="truncate text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1 truncate font-mono text-sm font-bold text-foreground tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <HealthTrend
          points={service.trend}
          label={service.name}
          status={service.status}
        />
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Last checked{" "}
          <time
            dateTime={service.lastCheckedAt}
            className="font-mono tabular-nums"
          >
            {formatHealthTimestamp(service.lastCheckedAt)}
          </time>
        </p>
      </CardContent>
    </Card>
  );
}

export function ServiceHealthSection({
  services,
}: {
  services: ServiceHealth[];
}) {
  return (
    <section aria-labelledby="service-health-title">
      <HealthSectionHeader
        id="service-health-title"
        eyebrow="Live service checks"
        title="Core Service Health"
      />
      {services.length > 0 ? (
        <div className="civic-stagger-auto grid gap-4 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceHealthCard key={service.key} service={service} />
          ))}
        </div>
      ) : (
        <Alert role="status">
          <Database aria-hidden="true" />
          <AlertTitle>No Service Checks Yet</AlertTitle>
          <AlertDescription>
            Refresh health data to begin monitoring the core services.
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}
