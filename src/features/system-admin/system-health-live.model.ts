import type { HealthCheck, HealthLiveSample, HealthStatus, SystemHealthDashboard } from "./system-admin.types";
import { isOpenIncident, worstStatus } from "./system-health.model";

export const HEALTH_SAMPLE_INTERVAL_MS = 5_000;
export const MAX_SESSION_SAMPLES = 720;

/** Overlay current measurements; persisted uptime, counts and incidents retain
 * their original meaning. Older loader responses cannot replace newer samples. */
export function withHealthSamples(data: SystemHealthDashboard, samples: HealthLiveSample[]): SystemHealthDashboard {
  const latest = samples.at(-1);
  if (!latest) return data;
  const services = data.services.map((service) => {
    const fresh = samples.filter((sample) => !service.lastCheckedAt || sample.at > service.lastCheckedAt);
    const readings: HealthCheck[] = fresh.flatMap((sample) => {
      const reading = sample.services.find((item) => item.key === service.key);
      if (!reading) return [];
      return [{ at: sample.at, responseMs: reading.responseMs, outcome: !reading.ok ? "failed" : (reading.responseMs ?? 0) > service.slowAfterMs ? "slow" : "ok" }];
    });
    const last = readings.at(-1);
    if (!last) return service;
    const status: HealthStatus = last.outcome === "ok" ? "operational" : last.outcome === "slow" ? "degraded" : service.key === "database" ? "outage" : "degraded";
    return {
      ...service, status, outcome: last.outcome, responseMs: last.responseMs,
      lastCheckedAt: last.at, checks: [...service.checks, ...readings],
      source: { ...service.source, measuredBy: "Read-only probes from the application server", updates: "Every 5 seconds while this page is open; session readings are not retained" },
    };
  });
  const answered = services.filter((service) => service.responseMs !== null);
  const slowest = answered.reduce<(typeof services)[number] | null>((result, service) => !result || (service.responseMs ?? 0) > (result.responseMs ?? 0) ? service : result, null);
  return {
    ...data,
    now: latest.at > data.now ? latest.at : data.now,
    checkedAt: services.reduce<string | null>((last, service) => service.lastCheckedAt && (!last || service.lastCheckedAt > last) ? service.lastCheckedAt : last, data.checkedAt),
    services,
    slowest: slowest && slowest.responseMs !== null ? { name: slowest.name, responseMs: slowest.responseMs } : null,
    overallStatus: worstStatus([
      ...services.map((service) => service.status),
      data.capacity.status === "unknown" ? "operational" : data.capacity.status,
      data.monitor.status === "degraded" ? "degraded" : "operational",
      ...data.events.filter(isOpenIncident).map((event): HealthStatus => event.severity === "critical" ? "outage" : "degraded"),
    ]),
  };
}
