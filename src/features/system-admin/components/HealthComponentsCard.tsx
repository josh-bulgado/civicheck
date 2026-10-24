import type { ReactNode } from "react";
import { Activity, Archive, ChevronRight, Database, HardDrive, LockKeyhole, type LucideIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Kbd } from "~/components/ui/kbd";
import { cn } from "~/lib/utils";
import { CAPACITY_ALERT_PERCENT, HEALTH_EVERY_MINUTES, MONITOR_STALE_AFTER_MINUTES } from "../system-health.model";
import { formatBytes, formatHealthClock, formatHealthPercent, formatResponseTime } from "../system-health.utils";
import type {
  HealthStatus,
  MonitorHealth,
  ServiceHealth,
  ServiceKey,
  StorageCapacity,
  SystemHealthDashboard,
} from "../system-admin.types";
import { CheckStrip, CheckStripLegend } from "./CheckStrip";
import { HealthMetrics, HealthSourceBlock } from "./HealthFacts";
import { HealthStatusBadge } from "./HealthStatusBadge";

const serviceIcons: Record<ServiceKey, LucideIcon> = {
  database: Database,
  authentication: LockKeyhole,
  storage: HardDrive,
};

const iconTile: Record<HealthStatus | "neutral", string> = {
  operational: "bg-health-success-bg text-health-success-fg",
  degraded: "bg-health-warning-bg text-health-warning-fg",
  outage: "bg-health-error-bg text-health-error-fg",
  unknown: "bg-health-neutral-bg text-health-neutral-fg",
  neutral: "bg-health-neutral-bg text-health-neutral-fg",
};

type RowProps = {
  icon: LucideIcon;
  name: string;
  description: string;
  /** The tint of the icon tile. */
  tone: HealthStatus | "neutral";
  /** The figure on the right, in mono. */
  reading: string;
  badge: ReactNode;
  /** What sits between the name and the reading: a check strip, a gauge. */
  middle?: ReactNode;
  defaultOpen: boolean;
  children: ReactNode;
};

/** One component. Closed it is a line; open it shows its figures, its source and its limit. */
function ComponentRow({ icon: Icon, name, description, tone, reading, badge, middle, defaultOpen, children }: RowProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-t border-border/60 first:border-t-0">
      <CollapsibleTrigger
        data-health-row
        className="group/row grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto_1.25rem] items-center gap-x-4 gap-y-1 px-5 py-3 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset max-md:grid-cols-[2.5rem_minmax(0,1fr)_1.25rem]"
      >
        <span className={cn("grid size-10 place-items-center rounded-xl", iconTile[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-semibold">{name}</span>
          <span className="block text-sm text-pretty text-muted-foreground">{description}</span>
        </span>
        <span className="flex items-center gap-5 max-md:hidden">
          {middle ? <span className="flex min-w-24 flex-col items-start gap-1">{middle}</span> : null}
          <span className="flex min-w-28 flex-col items-end gap-1">
            <span className="font-mono text-base font-semibold tabular-nums">{reading}</span>
            {badge}
          </span>
        </span>
        <ChevronRight
          className="size-4 text-muted-foreground transition-transform duration-200 group-aria-expanded/row:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 px-5 pb-4 pl-[4.5rem] max-md:pl-5">
        {/* On a phone the reading and status move here, because the row has no room for them. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:hidden">
          <span className="font-mono text-base font-semibold tabular-nums">{reading}</span>
          {badge}
          {middle ? <span className="flex basis-full flex-col items-start gap-1">{middle}</span> : null}
        </div>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function serviceSummary(service: ServiceHealth) {
  return `${formatHealthPercent(service.availabilityPercent ?? 0)} up · ${service.slowCount} slow · ${service.failedCount} failed`;
}

function ServiceRow({
  service,
  canManage,
  defaultOpen,
  onEditLimits,
  onShowSources,
}: {
  service: ServiceHealth;
  canManage: boolean;
  defaultOpen: boolean;
  onEditLimits: () => void;
  onShowSources: () => void;
}) {
  return (
    <ComponentRow
      icon={serviceIcons[service.key]}
      name={service.name}
      description={service.description}
      tone={service.status}
      reading={formatResponseTime(service.responseMs)}
      badge={<HealthStatusBadge status={service.status} />}
      defaultOpen={defaultOpen}
      middle={
        service.availabilityPercent === null ? (
          <span className="text-sm text-muted-foreground">No checks yet</span>
        ) : (
          <>
            <CheckStrip checks={service.checks} />
            <span className="text-sm text-muted-foreground">{serviceSummary(service)}</span>
          </>
        )
      }
    >
      <HealthMetrics
        items={[
          { label: "Response", value: formatResponseTime(service.responseMs) },
          {
            label: "24h uptime",
            value: service.availabilityPercent === null ? "No checks" : formatHealthPercent(service.availabilityPercent),
          },
          { label: "Counted slow after", value: formatResponseTime(service.slowAfterMs) },
          { label: "Last checked", value: service.lastCheckedAt ? formatHealthClock(service.lastCheckedAt) : "Never" },
        ]}
      />
      <HealthSourceBlock source={service.source}>
        <SourceLinks canManage={canManage} editLabel="Edit Limit" onEdit={onEditLimits} onShowSources={onShowSources} />
      </HealthSourceBlock>
    </ComponentRow>
  );
}

function SourceLinks({
  canManage,
  editLabel,
  onEdit,
  onShowSources,
}: {
  canManage: boolean;
  editLabel?: string;
  onEdit?: () => void;
  onShowSources: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {canManage && onEdit ? (
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          {editLabel}
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="sm" onClick={onShowSources}>
        All Sources
        <ChevronRight data-icon="inline-end" aria-hidden="true" />
      </Button>
    </div>
  );
}

function CapacityGauge({ capacity }: { capacity: StorageCapacity }) {
  if (!capacity.configured || capacity.percentUsed === null) {
    return <span className="text-sm text-muted-foreground">No capacity set</span>;
  }
  const used = Math.min(100, Math.max(capacity.percentUsed, 1));
  return (
    <>
      <span
        role="img"
        aria-label={`${capacity.percentUsed} percent of capacity used, alert at ${CAPACITY_ALERT_PERCENT} percent`}
        className="relative block h-2 w-24 rounded-full bg-muted"
      >
        <span className="block h-full rounded-full bg-primary-fill" style={{ width: `${used}%` }} />
        <span className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-health-warning-dot" style={{ left: `${CAPACITY_ALERT_PERCENT}%` }} />
      </span>
      <span className="text-sm text-muted-foreground">of {formatBytes(capacity.capacityBytes ?? 0)} · alert at {CAPACITY_ALERT_PERCENT}%</span>
    </>
  );
}

function CapacityRow({
  capacity,
  canManage,
  defaultOpen,
  onEditLimits,
  onShowSources,
}: {
  capacity: StorageCapacity;
  canManage: boolean;
  defaultOpen: boolean;
  onEditLimits: () => void;
  onShowSources: () => void;
}) {
  const noReading = capacity.totalBytes === null;
  return (
    <ComponentRow
      icon={Archive}
      name={capacity.name}
      description={
        noReading
          ? "No reading yet"
          : `${formatBytes(capacity.totalBytes as number)} used across ${capacity.objectCount ?? 0} objects${capacity.configured ? "" : ". No capacity is set."}`
      }
      tone={capacity.configured ? capacity.status : "neutral"}
      reading={capacity.percentUsed !== null ? `${capacity.percentUsed}%` : noReading ? "No data" : formatBytes(capacity.totalBytes as number)}
      badge={
        capacity.configured ? (
          <HealthStatusBadge status={capacity.status} />
        ) : (
          <Badge variant="neutral">Not Configured</Badge>
        )
      }
      defaultOpen={defaultOpen}
      middle={<CapacityGauge capacity={capacity} />}
    >
      <HealthMetrics
        items={[
          { label: "Used", value: noReading ? "No reading" : formatBytes(capacity.totalBytes as number) },
          { label: "Objects", value: capacity.objectCount ?? "No reading" },
          { label: "Capacity", value: capacity.capacityBytes ? formatBytes(capacity.capacityBytes) : "Not set" },
          { label: "Alert at", value: `${CAPACITY_ALERT_PERCENT}%` },
        ]}
      />
      {!capacity.configured ? (
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">
          With no capacity set there is no percent and no warning. Set one and this row becomes a gauge.
        </p>
      ) : null}
      <HealthSourceBlock source={capacity.source}>
        <SourceLinks
          canManage={canManage}
          editLabel={capacity.configured ? "Edit Capacity" : "Set Capacity"}
          onEdit={onEditLimits}
          onShowSources={onShowSources}
        />
      </HealthSourceBlock>
    </ComponentRow>
  );
}

function monitorReading(monitor: MonitorHealth) {
  if (monitor.status === "unknown") return "Not running";
  if (monitor.status === "degraded") return "Stopped";
  return `${monitor.succeeded24h} of ${monitor.runs24h}`;
}

function MonitorRow({
  monitor,
  defaultOpen,
  onShowSources,
}: {
  monitor: MonitorHealth;
  defaultOpen: boolean;
  onShowSources: () => void;
}) {
  const lastRun = monitor.lastRunAt ? formatHealthClock(monitor.lastRunAt) : "Never";
  return (
    <ComponentRow
      icon={Activity}
      name={monitor.name}
      description={
        monitor.status === "unknown"
          ? "No schedule is running yet. Readings change only on Check Now."
          : monitor.status === "degraded"
            ? `Last run ${lastRun}. It should run every ${HEALTH_EVERY_MINUTES} minutes.`
            : `Every ${HEALTH_EVERY_MINUTES} minutes. Last run ${lastRun}.`
      }
      tone={monitor.status}
      reading={monitorReading(monitor)}
      badge={
        monitor.status === "unknown" ? <Badge variant="neutral">Not Scheduled</Badge> : <HealthStatusBadge status={monitor.status} />
      }
      defaultOpen={defaultOpen}
      middle={<span className="text-sm text-muted-foreground">{monitor.status === "operational" ? "runs succeeded in 24h" : `last run ${lastRun}`}</span>}
    >
      <HealthMetrics
        items={[
          { label: "Last run", value: lastRun },
          { label: "Runs in 24h", value: monitor.runs24h },
          { label: "Succeeded", value: monitor.succeeded24h },
          { label: "Turns amber after", value: `${MONITOR_STALE_AFTER_MINUTES} min` },
        ]}
      />
      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
        {monitor.status === "degraded"
          ? "The monitor has not run on time, so every reading above is from the last run. Check Now runs it once. If it keeps stopping, look at the schedule."
          : "If this row stops updating, the monitor itself has stopped. It turns amber after 30 minutes without a run."}
      </p>
      <HealthSourceBlock source={monitor.source}>
        <SourceLinks canManage={false} onShowSources={onShowSources} />
      </HealthSourceBlock>
    </ComponentRow>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-border/60 px-5 pt-3 pb-1.5 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/** Every thing the page watches, in one list: services first, then storage capacity and the monitor. */
export function HealthComponentsCard({
  data,
  hotkeyLabel,
  onEditLimits,
  onShowSources,
}: {
  data: SystemHealthDashboard;
  hotkeyLabel: (hotkey: string) => string;
  onEditLimits: () => void;
  onShowSources: () => void;
}) {
  // Open the first thing that needs a look, so a problem explains itself.
  const needsReview = (status: HealthStatus) => status === "degraded" || status === "outage";
  const firstTroubled =
    data.services.find((s) => needsReview(s.status))?.key ??
    (needsReview(data.capacity.status) ? "capacity" : needsReview(data.monitor.status) ? "monitor" : null);

  return (
    <Card variant="quiet" size="sm" className="gap-0 pb-0">
      <CardHeader className="pb-3">
        <CardTitle>
          <h2 className="text-lg font-bold">Components</h2>
        </CardTitle>
        <CardDescription className="col-start-1 flex flex-col gap-2">
          <span>Five monitored. Open one for its source.</span>
          <CheckStripLegend />
        </CardDescription>
        {/* sr-only, not hidden: a hidden action still holds the header's second grid column on a phone. */}
        <CardAction aria-hidden="true" className="flex items-center gap-1.5 text-sm text-muted-foreground max-md:sr-only">
          <Kbd aria-hidden="true">{hotkeyLabel("J")}</Kbd>
          <Kbd aria-hidden="true">{hotkeyLabel("K")}</Kbd>
          to move
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <GroupLabel>Core Services</GroupLabel>
        {data.services.map((service) => (
          <ServiceRow
            key={service.key}
            service={service}
            canManage={data.canManage}
            defaultOpen={firstTroubled === service.key}
            onEditLimits={onEditLimits}
            onShowSources={onShowSources}
          />
        ))}
        <GroupLabel>Platform</GroupLabel>
        <CapacityRow
          capacity={data.capacity}
          canManage={data.canManage}
          defaultOpen={firstTroubled === "capacity"}
          onEditLimits={onEditLimits}
          onShowSources={onShowSources}
        />
        <MonitorRow monitor={data.monitor} defaultOpen={firstTroubled === "monitor"} onShowSources={onShowSources} />
      </CardContent>
    </Card>
  );
}

