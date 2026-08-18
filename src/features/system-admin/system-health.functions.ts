import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireActiveSession } from "~/server/auth";
import { getSupabaseAdminClient } from "~/utils/supabase";
import type {
  HealthEvent,
  HealthStatus,
  OperationalSignal,
  ServiceHealth,
  SystemHealthDashboard,
} from "./system-admin.types";

type ServiceKey = ServiceHealth["key"];

type ProbeResult<T = undefined> = {
  key: ServiceKey;
  status: HealthStatus;
  responseTimeMs: number | null;
  checkedAt: string;
  value: T | null;
};

type StorageUsage = {
  objectCount: number;
  totalBytes: number;
};

const serviceDetails: Record<
  ServiceKey,
  { name: string; description: string; slowAfterMs: number }
> = {
  database: {
    name: "Core database",
    description: "Profiles and operational records",
    slowAfterMs: 600,
  },
  authentication: {
    name: "Authentication",
    description: "Account sign-in and session service",
    slowAfterMs: 1_200,
  },
  storage: {
    name: "Document storage",
    description: "Protected upload storage availability",
    slowAfterMs: 1_500,
  },
};

const activeRequestStatuses = [
  "submitted",
  "under_validation",
  "processing",
  "pending_approval",
];

function normalizeStatus(value: unknown): HealthStatus {
  return value === "operational" ||
    value === "degraded" ||
    value === "outage"
    ? value
    : "unknown";
}

function numberOf(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function statusRank(status: HealthStatus): number {
  switch (status) {
    case "outage":
      return 3;
    case "degraded":
      return 2;
    case "unknown":
      return 1;
    default:
      return 0;
  }
}

async function runProbe<T>(
  key: ServiceKey,
  check: () => Promise<T>,
): Promise<ProbeResult<T>> {
  const startedAt = performance.now();
  try {
    const value = await check();
    const responseTimeMs = Math.max(0, Math.round(performance.now() - startedAt));
    return {
      key,
      status:
        responseTimeMs > serviceDetails[key].slowAfterMs
          ? "degraded"
          : "operational",
      responseTimeMs,
      checkedAt: new Date().toISOString(),
      value,
    };
  } catch {
    return {
      key,
      status: key === "database" ? "outage" : "degraded",
      responseTimeMs: null,
      checkedAt: new Date().toISOString(),
      value: null,
    };
  }
}

function buildServiceHealth(
  probe: ProbeResult<unknown>,
  historicalRows: Array<{
    component_key: string;
    status: string;
    response_time_ms: number | null;
    recorded_at: string;
  }>,
): ServiceHealth {
  const historical = historicalRows
    .filter((row) => row.component_key === probe.key)
    .map((row) => ({
      timestamp: row.recorded_at,
      responseTimeMs: row.response_time_ms,
      status: normalizeStatus(row.status),
    }));
  const trend = [
    ...historical,
    {
      timestamp: probe.checkedAt,
      responseTimeMs: probe.responseTimeMs,
      status: probe.status,
    },
  ].slice(-24);
  const successful = trend.filter((point) => point.status === "operational").length;
  const errors = trend.filter(
    (point) => point.status === "degraded" || point.status === "outage",
  ).length;

  return {
    key: probe.key,
    name: serviceDetails[probe.key].name,
    description: serviceDetails[probe.key].description,
    status: probe.status,
    responseTimeMs: probe.responseTimeMs,
    availabilityPercent: roundPercent((successful / trend.length) * 100),
    errorRatePercent: roundPercent((errors / trend.length) * 100),
    lastCheckedAt: probe.checkedAt,
    trend,
  };
}

function buildDerivedEvents(services: ServiceHealth[]): HealthEvent[] {
  const events: HealthEvent[] = [];

  for (const service of services) {
    for (let index = 1; index < service.trend.length; index += 1) {
      const previous = service.trend[index - 1];
      const current = service.trend[index];
      if (previous.status === current.status) continue;

      const recovered =
        current.status === "operational" && previous.status !== "operational";
      events.push({
        id: `derived-${service.key}-${current.timestamp}`,
        component: service.name,
        title: recovered
          ? `${service.name} recovered`
          : `${service.name} changed to ${current.status}`,
        summary: recovered
          ? "The latest aggregate probe returned to normal."
          : "The aggregate availability or response-time probe crossed its health threshold.",
        type: recovered ? "recovery" : "degradation",
        severity: recovered
          ? "info"
          : current.status === "outage"
            ? "critical"
            : "warning",
        timestamp: current.timestamp,
        resolvedAt: recovered ? current.timestamp : null,
        relatedAuditEventId: null,
      });
    }

    if (service.status !== "operational") {
      events.push({
        id: `active-${service.key}`,
        component: service.name,
        title: `${service.name} is ${service.status}`,
        summary: "The current metadata-only probe requires operational review.",
        type: "degradation",
        severity: service.status === "outage" ? "critical" : "warning",
        timestamp: service.lastCheckedAt,
        resolvedAt: null,
        relatedAuditEventId: null,
      });
    }
  }

  return events;
}

export const getSystemHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<SystemHealthDashboard> => {
    await requireActiveSession("health:view");
    setResponseHeader("Cache-Control", "no-store");

    const admin = getSupabaseAdminClient();
    const checkedAt = new Date().toISOString();
    const historyCutoff = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
    const workflowCutoff = Date.now() - 48 * 60 * 60 * 1_000;

    const databaseProbePromise = runProbe("database", async () => {
      const { error } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
    });
    const authenticationProbePromise = runProbe("authentication", async () => {
      const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw error;
    });
    const storageProbePromise = runProbe<StorageUsage>("storage", async () => {
      const [buckets, usage] = await Promise.all([
        admin.storage.listBuckets(),
        admin.rpc("system_health_storage_usage"),
      ]);
      if (buckets.error) throw buckets.error;
      if (usage.error) throw usage.error;
      const row = Array.isArray(usage.data) ? usage.data[0] : usage.data;
      return {
        objectCount: numberOf(row?.object_count),
        totalBytes: numberOf(row?.total_bytes),
      };
    });

    const historyPromise = admin
      .from("system_health_snapshots")
      .select("component_key, status, response_time_ms, recorded_at")
      .gte("recorded_at", historyCutoff)
      .order("recorded_at", { ascending: true })
      .limit(500);
    const jobsPromise = admin
      .from("system_background_job_runs")
      .select("status, retry_count, started_at, completed_at")
      .gte("started_at", historyCutoff);
    const workflowPromise = admin
      .from("requests")
      .select("status, updated_at")
      .in("status", activeRequestStatuses);
    const eventsPromise = admin
      .from("system_operational_events")
      .select(
        "id, component_key, severity, event_type, title, summary, started_at, resolved_at, related_audit_event_id",
      )
      .order("started_at", { ascending: false })
      .limit(12);

    const [
      databaseProbe,
      authenticationProbe,
      storageProbe,
      historyResult,
      jobsResult,
      workflowResult,
      eventsResult,
    ] = await Promise.all([
      databaseProbePromise,
      authenticationProbePromise,
      storageProbePromise,
      historyPromise,
      jobsPromise,
      workflowPromise,
      eventsPromise,
    ]);

    const probes = [databaseProbe, authenticationProbe, storageProbe];
    const { error: snapshotError } = await admin
      .from("system_health_snapshots")
      .insert(
        probes.map((probe) => ({
          component_key: probe.key,
          status: probe.status,
          response_time_ms: probe.responseTimeMs,
          recorded_at: probe.checkedAt,
        })),
      );
    if (snapshotError) {
      console.warn("System health snapshot could not be recorded.");
    }

    const historicalRows = historyResult.error ? [] : (historyResult.data ?? []);
    const services = probes.map((probe) =>
      buildServiceHealth(probe, historicalRows),
    );

    const jobRows = jobsResult.error ? [] : (jobsResult.data ?? []);
    const failedJobs = jobRows.filter((row) => row.status === "failed").length;
    const jobsStatus: HealthStatus = jobsResult.error
      ? "unknown"
      : failedJobs > 0
        ? "degraded"
        : "operational";

    const workflowRows = workflowResult.error ? [] : (workflowResult.data ?? []);
    const stalledRequests = workflowRows.filter(
      (row) => new Date(row.updated_at).getTime() < workflowCutoff,
    ).length;
    const workflowStatus: HealthStatus = workflowResult.error
      ? "unknown"
      : stalledRequests > 0
        ? "degraded"
        : "operational";

    const storageCapacity = numberOf(process.env.SUPABASE_STORAGE_CAPACITY_BYTES);
    const storageUsage = storageProbe.value;
    const storagePercent =
      storageUsage && storageCapacity > 0
        ? roundPercent((storageUsage.totalBytes / storageCapacity) * 100)
        : null;
    const storageSignalStatus: HealthStatus =
      storageProbe.status !== "operational"
        ? storageProbe.status
        : storagePercent !== null && storagePercent >= 85
          ? "degraded"
          : "operational";

    const signals: OperationalSignal[] = [
      {
        key: "jobs",
        label: "Background jobs",
        value: jobsResult.error ? "Unavailable" : `${failedJobs} failed`,
        detail: jobsResult.error
          ? "Job telemetry is unavailable."
          : `${jobRows.length} runs recorded in the last 24 hours.`,
        status: jobsStatus,
      },
      {
        key: "storage",
        label: "Storage capacity",
        value: storageUsage
          ? `${(storageUsage.totalBytes / 1_048_576).toFixed(1)} MB`
          : "Unavailable",
        detail: storageUsage
          ? storagePercent === null
            ? `${storageUsage.objectCount} objects; capacity baseline not configured.`
            : `${storagePercent}% of configured capacity across ${storageUsage.objectCount} objects.`
          : "Aggregate storage telemetry is unavailable.",
        status: storageSignalStatus,
      },
      {
        key: "workflow",
        label: "Request workflow",
        value: workflowResult.error
          ? "Unavailable"
          : `${stalledRequests} stalled`,
        detail: workflowResult.error
          ? "Workflow telemetry is unavailable."
          : `${workflowRows.length} active records checked; stalled means no update for 48 hours.`,
        status: workflowStatus,
      },
    ];

    const explicitEvents: HealthEvent[] = eventsResult.error
      ? []
      : (eventsResult.data ?? []).map((event) => ({
          id: event.id,
          component: event.component_key,
          title: event.title,
          summary: event.summary,
          type: event.event_type as HealthEvent["type"],
          severity: event.severity as HealthEvent["severity"],
          timestamp: event.started_at,
          resolvedAt: event.resolved_at,
          relatedAuditEventId: event.related_audit_event_id,
        }));
    const activeEventStatuses: HealthStatus[] = explicitEvents
      .filter(
        (event) => event.type === "degradation" && event.resolvedAt === null,
      )
      .map((event) =>
        event.severity === "critical" ? "outage" : "degraded",
      );
    const events = [...explicitEvents, ...buildDerivedEvents(services)]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 10);

    const allStatuses = [
      ...services.map((service) => service.status),
      ...signals.map((signal) => signal.status),
      ...activeEventStatuses,
    ];
    const overallStatus = allStatuses.reduce<HealthStatus>((worst, status) =>
      statusRank(status) > statusRank(worst) ? status : worst,
    "operational");
    const availabilityPercent = roundPercent(
      services.reduce((total, service) => total + service.availabilityPercent, 0) /
        services.length,
    );
    const activeDegradations = allStatuses.filter(
      (status) => status === "degraded" || status === "outage",
    ).length;

    return {
      overallStatus,
      availabilityPercent,
      activeDegradations,
      checkedAt,
      services,
      signals,
      events,
    };
  },
);
