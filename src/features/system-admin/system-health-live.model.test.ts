import { describe, expect, it } from "vitest";
import type { HealthLiveSample, SystemHealthDashboard } from "./system-admin.types";
import { withHealthSamples } from "./system-health-live.model";

const recordedAt = "2026-10-26T12:00:00.000Z";
const source = { measuredBy: "Background probe", updates: "Every 15 minutes", exposure: "Timings only" };
function dashboard(): SystemHealthDashboard {
  return {
    now: recordedAt, checkedAt: recordedAt, overallStatus: "operational", availabilityPercent: 99,
    slowest: { name: "storage", responseMs: 100 }, activeCount: 0, events: [], security: null, canManage: true,
    lastManualCheckAt: null, settings: { emailAlerts: false, cooldownMinutes: 30 },
    services: (["database", "authentication", "storage"] as const).map((key) => ({ key, name: key, description: key, status: "operational", outcome: "ok", responseMs: 100, slowAfterMs: 600, availabilityPercent: 99, okCount: 95, slowCount: 1, failedCount: 0, lastCheckedAt: recordedAt, checks: [{ at: recordedAt, outcome: "ok", responseMs: 100 }], source })),
    capacity: { name: "Capacity", description: "", status: "unknown", configured: false, objectCount: null, totalBytes: null, capacityBytes: null, percentUsed: null, lastCheckedAt: null, source },
    monitor: { name: "Scheduled checks", description: "", status: "operational", lastRunAt: recordedAt, lastRunSucceeded: true, runs24h: 96, succeeded24h: 96, minutesSinceLastRun: 0, source },
  };
}
const sample: HealthLiveSample = { at: "2026-10-26T12:00:05.000Z", services: [{ key: "database", ok: true, responseMs: 750 }, { key: "authentication", ok: true, responseMs: 123 }, { key: "storage", ok: true, responseMs: 200 }] };

describe("session health readings", () => {
  it("updates latency, status and chart points while preserving recorded availability and counts", () => {
    const base = dashboard();
    const result = withHealthSamples(base, [sample]);
    expect(result.services[0].responseMs).toBe(750);
    expect(result.services[0].status).toBe("degraded");
    expect(result.services[0].checks.at(-1)?.at).toBe(sample.at);
    expect(result.slowest).toEqual({ name: "database", responseMs: 750 });
    expect(result.availabilityPercent).toBe(99);
    expect(result.services[0].okCount).toBe(95);
    expect(result.events).toBe(base.events);
    expect(result.monitor).toBe(base.monitor);
    expect(base.services[0].checks).toHaveLength(1);
  });
  it("never replaces newer persisted readings with an older session sample", () => {
    const base = dashboard();
    base.services[0].lastCheckedAt = "2026-10-26T12:01:00.000Z";
    expect(withHealthSamples(base, [sample]).services[0]).toBe(base.services[0]);
  });
  it("shows a failed database probe as an outage and preserves the chart's missing value", () => {
    const result = withHealthSamples(dashboard(), [{ ...sample, services: [{ key: "database", ok: false, responseMs: null }] }]);
    expect(result.overallStatus).toBe("outage");
    expect(result.services[0].checks.at(-1)).toEqual({ at: sample.at, outcome: "failed", responseMs: null });
  });
});
