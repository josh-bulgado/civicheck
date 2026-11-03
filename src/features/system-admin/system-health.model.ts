import type {
  CheckOutcome,
  HealthCheck,
  HealthEvent,
  HealthSource,
  HealthStatus,
  MonitorHealth,
  SecurityGlance,
  ServiceHealth,
  ServiceKey,
  StorageCapacity,
  SystemHealthDashboard,
} from "./system-admin.types";
import { formatBytes, formatHealthClock, formatResponseTime } from "./system-health.utils";

/** Checks run on this rhythm. The schedule in the database must match. */
export const HEALTH_EVERY_MINUTES = 15;
/** A monitor that has not run for this long has stopped. */
export const MONITOR_STALE_AFTER_MINUTES = 30;
/** Capacity turns degraded at this share of the configured size. Matches the database. */
export const CAPACITY_ALERT_PERCENT = 85;
/** One manual check per this long, so Check Now cannot be hammered. */
export const MANUAL_CHECK_COOLDOWN_SECONDS = 60;

// ── What system_health_summary() and system_health_series() return ───────────

type RawComponent = {
  key: string;
  name: string;
  description: string;
  kind: "service" | "platform";
  measured_by: string;
  update_cadence: string;
  exposure: string;
  slow_after_ms: number | null;
  capacity_bytes: number | null;
  sort_order: number;
  last_at: string | null;
  last_outcome: CheckOutcome | null;
  last_status: HealthStatus | null;
  last_ms: number | null;
  object_count: number | null;
  total_bytes: number | null;
  availability: number | null;
  ok_n: number;
  slow_n: number;
  failed_n: number;
};

type RawEvent = {
  id: string;
  component_key: string;
  severity: HealthEvent["severity"];
  event_type: HealthEvent["type"];
  title: string;
  summary: string;
  started_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  planned_start: string | null;
  planned_end: string | null;
  related_audit_event_id: string | null;
};

export type RawHealthSummary = {
  now: string;
  checked_at: string | null;
  last_manual_at: string | null;
  components: RawComponent[];
  monitor: {
    last_run_at: string | null;
    last_status: "running" | "succeeded" | "failed" | "cancelled" | null;
    runs_24h: number;
    ok_24h: number;
  } | null;
  events: RawEvent[];
  settings: { email_alerts: boolean; cooldown_minutes: number } | null;
};

export type RawSeriesRow = {
  component_key: string;
  recorded_at: string;
  outcome: CheckOutcome;
  response_time_ms: number | null;
};

// ── Building the page's data ─────────────────────────────────────────────────

const STATUS_RANK: Record<HealthStatus, number> = {
  operational: 0,
  unknown: 1,
  degraded: 2,
  outage: 3,
};

export function worstStatus(statuses: HealthStatus[]): HealthStatus {
  return statuses.reduce<HealthStatus>(
    (worst, status) => (STATUS_RANK[status] > STATUS_RANK[worst] ? status : worst),
    "operational",
  );
}

function sourceOf(component: RawComponent): HealthSource {
  return {
    measuredBy: component.measured_by,
    updates: component.update_cadence,
    exposure: component.exposure,
  };
}

function minutesBetween(from: string, to: string) {
  return Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60_000));
}

function toService(component: RawComponent, checks: HealthCheck[]): ServiceHealth {
  return {
    key: component.key as ServiceKey,
    name: component.name,
    description: component.description,
    status: component.last_status ?? "unknown",
    outcome: component.last_outcome,
    responseMs: component.last_ms,
    slowAfterMs: component.slow_after_ms ?? 0,
    availabilityPercent: component.availability,
    okCount: component.ok_n,
    slowCount: component.slow_n,
    failedCount: component.failed_n,
    lastCheckedAt: component.last_at,
    checks,
    source: sourceOf(component),
  };
}

function toCapacity(component: RawComponent): StorageCapacity {
  const configured = component.capacity_bytes !== null;
  const percentUsed =
    configured && component.total_bytes !== null
      ? Math.round((component.total_bytes / (component.capacity_bytes as number)) * 1000) / 10
      : null;
  const status: HealthStatus =
    component.last_at === null
      ? "unknown"
      : component.last_outcome === "failed"
        ? "degraded"
        : percentUsed !== null && percentUsed >= CAPACITY_ALERT_PERCENT
          ? "degraded"
          : "operational";
  return {
    name: component.name,
    description: component.description,
    status,
    configured,
    objectCount: component.object_count,
    totalBytes: component.total_bytes,
    capacityBytes: component.capacity_bytes,
    percentUsed,
    lastCheckedAt: component.last_at,
    source: sourceOf(component),
  };
}

function toMonitor(
  component: RawComponent,
  raw: RawHealthSummary["monitor"],
  now: string,
): MonitorHealth {
  const lastRunAt = raw?.last_run_at ?? null;
  const minutesSinceLastRun = lastRunAt ? minutesBetween(lastRunAt, now) : null;
  const lastRunSucceeded = raw?.last_status ? raw.last_status === "succeeded" : null;
  const status: HealthStatus =
    lastRunAt === null
      ? "unknown"
      : lastRunSucceeded === false || (minutesSinceLastRun ?? 0) > MONITOR_STALE_AFTER_MINUTES
        ? "degraded"
        : "operational";
  return {
    name: component.name,
    description: component.description,
    status,
    lastRunAt,
    lastRunSucceeded,
    runs24h: raw?.runs_24h ?? 0,
    succeeded24h: raw?.ok_24h ?? 0,
    minutesSinceLastRun,
    source: sourceOf(component),
  };
}

function toEvent(raw: RawEvent, names: Map<string, string>): HealthEvent {
  return {
    id: raw.id,
    componentKey: raw.component_key,
    component: raw.component_key === "all" ? "All services" : (names.get(raw.component_key) ?? raw.component_key),
    title: raw.title,
    summary: raw.summary,
    type: raw.event_type,
    severity: raw.severity,
    startedAt: raw.started_at,
    resolvedAt: raw.resolved_at,
    acknowledgedAt: raw.acknowledged_at,
    acknowledgedByName: raw.acknowledged_by_name,
    plannedStart: raw.planned_start,
    plannedEnd: raw.planned_end,
    relatedAuditEventId: raw.related_audit_event_id,
  };
}

export function isOpenIncident(event: HealthEvent) {
  return event.type === "degradation" && event.resolvedAt === null;
}

export function isPlanned(event: HealthEvent, now: string) {
  return event.type === "maintenance" && event.plannedEnd !== null && event.plannedEnd > now;
}

/** Everything in the last 7 days that is neither open nor upcoming. */
export function isHistory(event: HealthEvent, now: string) {
  return !isOpenIncident(event) && !isPlanned(event, now);
}

export function buildDashboard({
  summary,
  series,
  security,
  canManage,
}: {
  summary: RawHealthSummary;
  series: RawSeriesRow[];
  security: SecurityGlance | null;
  canManage: boolean;
}): SystemHealthDashboard {
  const checksByKey = new Map<string, HealthCheck[]>();
  for (const row of series) {
    const list = checksByKey.get(row.component_key) ?? [];
    list.push({ at: row.recorded_at, outcome: row.outcome, responseMs: row.response_time_ms });
    checksByKey.set(row.component_key, list);
  }

  const components = [...summary.components].sort((a, b) => a.sort_order - b.sort_order);
  const names = new Map(components.map((c) => [c.key, c.name]));
  const services = components
    .filter((c) => c.kind === "service")
    .map((c) => toService(c, checksByKey.get(c.key) ?? []));

  const capacityRaw = components.find((c) => c.key === "capacity");
  const monitorRaw = components.find((c) => c.key === "monitor");
  if (!capacityRaw || !monitorRaw) {
    throw new Error("The health components table is missing its capacity or monitor row.");
  }
  const capacity = toCapacity(capacityRaw);
  const monitor = toMonitor(monitorRaw, summary.monitor, summary.now);
  const events = summary.events.map((event) => toEvent(event, names));

  const withAvailability = services.filter((s) => s.availabilityPercent !== null);
  const availabilityPercent = withAvailability.length
    ? Math.round(
        (withAvailability.reduce((sum, s) => sum + (s.availabilityPercent as number), 0) /
          withAvailability.length) * 10,
      ) / 10
    : null;

  const answered = services.filter((s) => s.responseMs !== null);
  const slowestService = answered.reduce<ServiceHealth | null>(
    (slowest, s) => (slowest === null || (s.responseMs as number) > (slowest.responseMs as number) ? s : slowest),
    null,
  );

  const open = events.filter(isOpenIncident);
  const statuses: HealthStatus[] = [
    ...services.map((s) => s.status),
    capacity.status === "unknown" ? "operational" : capacity.status,
    monitor.status === "degraded" ? "degraded" : "operational",
    ...open.map((e): HealthStatus => (e.severity === "critical" ? "outage" : "degraded")),
  ];

  return {
    overallStatus: worstStatus(statuses),
    availabilityPercent,
    slowest: slowestService
      ? { name: slowestService.name, responseMs: slowestService.responseMs as number }
      : null,
    activeCount: open.length + (monitor.status === "degraded" ? 1 : 0),
    checkedAt: summary.checked_at,
    now: summary.now,
    services,
    capacity,
    monitor,
    events,
    settings: {
      emailAlerts: summary.settings?.email_alerts ?? false,
      cooldownMinutes: summary.settings?.cooldown_minutes ?? 30,
    },
    security,
    lastManualCheckAt: summary.last_manual_at,
    canManage,
  };
}

// ── What the page says ───────────────────────────────────────────────────────

export type VerdictTone = "ok" | "warn" | "err" | "neutral";

export type HealthVerdict = { tone: VerdictTone; title: string; body: string };

function agoLabel(minutes: number) {
  if (minutes < 1) return "less than a minute ago";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  return `about ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
}

function listNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function otherServicesClause(services: ServiceHealth[], troubled: ServiceHealth[]) {
  const others = services.length - troubled.length;
  if (others <= 0) return "";
  if (services.some((s) => !troubled.includes(s) && s.status !== "operational")) return "";
  if (others === 1) return " The other service is operational.";
  return ` The other ${others === 2 ? "two" : others} services are operational.`;
}

/** The sentence at the top of the page. One place decides what the platform is doing. */
export function healthVerdict(data: SystemHealthDashboard): HealthVerdict {
  const { services, capacity, monitor } = data;

  if (data.checkedAt === null) {
    return {
      tone: "neutral",
      title: "No Checks Yet",
      body: "Run Check Now to take the first reading. Scheduled checks are not running yet.",
    };
  }

  if (monitor.status === "degraded") {
    const when = monitor.lastRunAt ? formatHealthClock(monitor.lastRunAt) : "an unknown time";
    const ago = monitor.minutesSinceLastRun !== null ? `, ${agoLabel(monitor.minutesSinceLastRun)}` : "";
    return {
      tone: "warn",
      title: "Checks Have Stopped",
      body: `The last check ran at ${when}${ago}, and checks should run every ${HEALTH_EVERY_MINUTES} minutes. The readings below are from then. Run Check Now to refresh them.`,
    };
  }

  const troubled = services.filter((s) => s.status === "degraded" || s.status === "outage");
  if (troubled.length === 1) {
    const [service] = troubled;
    const rest = otherServicesClause(services, troubled);
    if (service.outcome === "failed") {
      return {
        tone: service.status === "outage" ? "err" : "warn",
        title: `${service.name} Is Not Responding`,
        body: `${service.name} did not answer its last check.${rest}`,
      };
    }
    return {
      tone: "warn",
      title: `${service.name} Is Slow`,
      body: `${service.name} took ${formatResponseTime(service.responseMs)} on its last check, against a limit of ${formatResponseTime(service.slowAfterMs)}.${rest}`,
    };
  }
  if (troubled.length > 1) {
    return {
      tone: troubled.some((s) => s.status === "outage") ? "err" : "warn",
      title: `${troubled.length} Services Need Review`,
      body: `${listNames(troubled.map((s) => s.name))} did not pass their last check.`,
    };
  }

  if (capacity.status === "degraded") {
    return {
      tone: "warn",
      title: "Storage Is Nearly Full",
      body:
        capacity.percentUsed !== null && capacity.capacityBytes !== null
          ? `${capacity.percentUsed}% of the ${formatBytes(capacity.capacityBytes)} capacity is used. The alert is at ${CAPACITY_ALERT_PERCENT}%.`
          : "The storage check did not return a reading.",
    };
  }

  const hadTrouble = services.filter((s) => s.slowCount + s.failedCount > 0);
  const total = hadTrouble.reduce((sum, s) => sum + s.slowCount + s.failedCount, 0);
  const trouble = hadTrouble.length
    ? ` ${listNames(hadTrouble.map((s) => s.name))} had ${total} slow or failed ${total === 1 ? "check" : "checks"} in the last 24 hours and ${hadTrouble.length === 1 ? "is" : "are"} fine now.`
    : "";
  const unscheduled =
    monitor.status === "unknown"
      ? " Scheduled checks have not run yet, so readings change only when someone runs Check Now."
      : "";
  return {
    tone: "ok",
    title: "All Systems Operational",
    body: `The database, authentication and document storage all answered the last check.${trouble}${unscheduled}`,
  };
}

/** The next run of a schedule that fires every 15 minutes, on the quarter hour. */
export function nextScheduledRun(now: string) {
  const step = HEALTH_EVERY_MINUTES * 60_000;
  return new Date(Math.floor(new Date(now).getTime() / step) * step + step).toISOString();
}

/** The line under the page title. */
export function headerLine(data: SystemHealthDashboard) {
  const { monitor } = data;
  if (monitor.status === "unknown") {
    return data.checkedAt
      ? `No schedule is running yet · last check ${formatHealthClock(data.checkedAt)}`
      : "No schedule is running yet · no checks recorded";
  }
  const last = monitor.lastRunAt ? formatHealthClock(monitor.lastRunAt) : "never";
  if (monitor.status === "degraded") {
    const ago = monitor.minutesSinceLastRun !== null ? `, ${agoLabel(monitor.minutesSinceLastRun)}` : "";
    return `Checks should run every ${HEALTH_EVERY_MINUTES} minutes · last run ${last}${ago}`;
  }
  return `Checks run every ${HEALTH_EVERY_MINUTES} minutes · last ${last}, next ${formatHealthClock(nextScheduledRun(data.now))}`;
}

/** Plain text for the Copy Summary button: state, readings and the checked time. */
export function summaryText(data: SystemHealthDashboard) {
  const verdict = healthVerdict(data);
  const lines = [
    `System Health, ${data.checkedAt ? formatHealthClock(data.checkedAt) : "no checks yet"}`,
    `State: ${verdict.title}. ${verdict.body}`,
    ...data.services.map(
      (s) => `${s.name}: ${formatResponseTime(s.responseMs)} (limit ${formatResponseTime(s.slowAfterMs)}, ${s.availabilityPercent ?? "no"}% up in 24 hours)`,
    ),
    data.capacity.totalBytes !== null
      ? `Storage used: ${formatBytes(data.capacity.totalBytes)}${data.capacity.objectCount !== null ? ` (${data.capacity.objectCount} objects)` : ""}`
      : "Storage used: no reading",
  ];
  return lines.join("\n");
}
