import { describe, expect, it } from "vitest";
import {
  buildDashboard,
  healthVerdict,
  headerLine,
  isHistory,
  isOpenIncident,
  isPlanned,
  nextScheduledRun,
  summaryText,
  worstStatus,
  type RawHealthSummary,
  type RawSeriesRow,
} from "./system-health.model";
import { formatBytes } from "./system-health.utils";

const NOW = "2026-10-24T06:50:00.000Z"; // 2:50 PM in Manila

function component(
  key: string,
  patch: Record<string, unknown> = {},
): RawHealthSummary["components"][number] {
  return {
    key,
    name: key,
    description: "",
    kind: "service",
    measured_by: "A probe",
    update_cadence: "Every 15 minutes",
    exposure: "Availability and response time only",
    slow_after_ms: 1000,
    capacity_bytes: null,
    sort_order: 1,
    last_at: "2026-10-24T06:46:00.000Z",
    last_outcome: "ok",
    last_status: "operational",
    last_ms: 100,
    object_count: null,
    total_bytes: null,
    availability: 100,
    ok_n: 96,
    slow_n: 0,
    failed_n: 0,
    ...patch,
  };
}

function summary(patch: Partial<RawHealthSummary> = {}): RawHealthSummary {
  return {
    now: NOW,
    checked_at: "2026-10-24T06:46:00.000Z",
    last_manual_at: null,
    components: [
      component("database", { name: "Core database", sort_order: 1, last_ms: 88, slow_after_ms: 600 }),
      component("authentication", { name: "Authentication", sort_order: 2, last_ms: 110, slow_after_ms: 1200 }),
      component("storage", { name: "Document storage", sort_order: 3, last_ms: 233, slow_after_ms: 1500 }),
      component("capacity", {
        name: "Storage capacity",
        kind: "platform",
        sort_order: 4,
        slow_after_ms: null,
        capacity_bytes: 1_073_741_824,
        total_bytes: 17_196_646,
        object_count: 182,
        last_ms: null,
      }),
      component("monitor", { name: "Scheduled checks", kind: "platform", sort_order: 5, slow_after_ms: null }),
    ],
    monitor: { last_run_at: "2026-10-24T06:46:00.000Z", last_status: "succeeded", runs_24h: 96, ok_24h: 96 },
    events: [],
    settings: { email_alerts: false, cooldown_minutes: 30 },
    ...patch,
  };
}

function build(patch: Partial<RawHealthSummary> = {}, series: RawSeriesRow[] = []) {
  return buildDashboard({ summary: summary(patch), series, security: null, canManage: true });
}

function withStorage(storage: Record<string, unknown>) {
  const base = summary();
  return {
    components: base.components.map((c) => (c.key === "storage" ? { ...c, ...storage } : c)),
  };
}

describe("buildDashboard", () => {
  it("keeps the services in order and reads capacity and the monitor apart", () => {
    const data = build();
    expect(data.services.map((s) => s.key)).toEqual(["database", "authentication", "storage"]);
    expect(data.capacity.percentUsed).toBe(1.6);
    expect(data.capacity.configured).toBe(true);
    expect(data.monitor.status).toBe("operational");
    expect(data.overallStatus).toBe("operational");
    expect(data.canManage).toBe(true);
  });

  it("averages availability by service and names the slowest answer", () => {
    const data = build(withStorage({ availability: 95.8 }));
    expect(data.availabilityPercent).toBe(98.6);
    expect(data.slowest).toEqual({ name: "Document storage", responseMs: 233 });
  });

  it("has no availability or slowest reading before the first check", () => {
    const empty = summary({
      checked_at: null,
      components: summary().components.map((c) => ({
        ...c,
        last_at: null,
        last_outcome: null,
        last_status: null,
        last_ms: null,
        availability: null,
      })),
      monitor: null,
    });
    const data = buildDashboard({ summary: empty, series: [], security: null, canManage: false });
    expect(data.availabilityPercent).toBeNull();
    expect(data.slowest).toBeNull();
    expect(data.monitor.status).toBe("unknown");
    expect(data.capacity.status).toBe("unknown");
    // Nothing measured is not the same as nothing wrong.
    expect(data.overallStatus).toBe("unknown");
  });

  it("groups the series by service, oldest first", () => {
    const series: RawSeriesRow[] = [
      { component_key: "storage", recorded_at: "2026-10-24T05:00:00.000Z", outcome: "ok", response_time_ms: 200 },
      { component_key: "storage", recorded_at: "2026-10-24T05:15:00.000Z", outcome: "slow", response_time_ms: 1700 },
      { component_key: "database", recorded_at: "2026-10-24T05:00:00.000Z", outcome: "ok", response_time_ms: 90 },
    ];
    const data = build({}, series);
    expect(data.services[2].checks.map((c) => c.outcome)).toEqual(["ok", "slow"]);
    expect(data.services[0].checks).toHaveLength(1);
  });

  it("counts open incidents and a stopped monitor as active", () => {
    const data = build({
      monitor: { last_run_at: "2026-10-24T05:00:00.000Z", last_status: "succeeded", runs_24h: 60, ok_24h: 60 },
      events: [
        {
          id: "e1",
          component_key: "storage",
          severity: "warning",
          event_type: "degradation",
          title: "Document storage is slow",
          summary: "",
          started_at: "2026-10-24T06:31:00.000Z",
          resolved_at: null,
          acknowledged_at: null,
          acknowledged_by_name: null,
          planned_start: null,
          planned_end: null,
          related_audit_event_id: null,
        },
      ],
    });
    expect(data.monitor.status).toBe("degraded");
    expect(data.activeCount).toBe(2);
    expect(data.overallStatus).toBe("degraded");
    expect(data.events[0].component).toBe("Document storage");
  });

  it("calls an unconfigured capacity operational, and 85% degraded", () => {
    const base = summary();
    const set = (patch: Record<string, unknown>) =>
      buildDashboard({
        summary: { ...base, components: base.components.map((c) => (c.key === "capacity" ? { ...c, ...patch } : c)) },
        series: [],
        security: null,
        canManage: true,
      });
    expect(set({ capacity_bytes: null }).capacity.configured).toBe(false);
    expect(set({ capacity_bytes: null }).capacity.status).toBe("operational");
    expect(set({ capacity_bytes: 20_000_000, total_bytes: 17_000_000 }).capacity.status).toBe("degraded");
    expect(set({ capacity_bytes: 20_000_000, total_bytes: 16_000_000 }).capacity.status).toBe("operational");
  });
});

describe("monitor status", () => {
  const monitorAt = (minutesAgo: number, status: "succeeded" | "failed" = "succeeded") =>
    build({
      monitor: {
        last_run_at: new Date(new Date(NOW).getTime() - minutesAgo * 60_000).toISOString(),
        last_status: status,
        runs_24h: 10,
        ok_24h: 10,
      },
    }).monitor;

  it("is operational through 30 minutes and degraded after", () => {
    expect(monitorAt(29).status).toBe("operational");
    expect(monitorAt(30).status).toBe("operational");
    expect(monitorAt(31).status).toBe("degraded");
  });

  it("is degraded when the last run failed, however recent", () => {
    expect(monitorAt(2, "failed").status).toBe("degraded");
  });

  it("is unknown before the first run", () => {
    expect(build({ monitor: null }).monitor.status).toBe("unknown");
  });
});

describe("healthVerdict", () => {
  it("says so when nothing has been checked", () => {
    const empty = summary({
      checked_at: null,
      monitor: null,
      components: summary().components.map((c) => ({ ...c, last_at: null, last_outcome: null, last_status: null })),
    });
    const verdict = healthVerdict(buildDashboard({ summary: empty, series: [], security: null, canManage: true }));
    expect(verdict.title).toBe("No Checks Yet");
    expect(verdict.tone).toBe("neutral");
  });

  it("reports a stopped monitor ahead of fresh readings", () => {
    const verdict = healthVerdict(
      build({ monitor: { last_run_at: "2026-10-24T05:46:00.000Z", last_status: "succeeded", runs_24h: 50, ok_24h: 50 } }),
    );
    expect(verdict.title).toBe("Checks Have Stopped");
    expect(verdict.body).toContain("1:46 PM");
    expect(verdict.body).toContain("about 1 hour ago");
  });

  it("names a slow service and says the others are fine", () => {
    const verdict = healthVerdict(
      build(withStorage({ last_ms: 1820, last_outcome: "slow", last_status: "degraded", slow_after_ms: 1500 })),
    );
    expect(verdict.tone).toBe("warn");
    expect(verdict.title).toBe("Document storage Is Slow");
    expect(verdict.body).toContain("1,820 ms");
    expect(verdict.body).toContain("limit of 1,500 ms");
    expect(verdict.body).toContain("The other two services are operational.");
  });

  it("calls a failed database an outage", () => {
    const base = summary();
    const data = buildDashboard({
      summary: {
        ...base,
        components: base.components.map((c) =>
          c.key === "database" ? { ...c, last_outcome: "failed", last_status: "outage", last_ms: null } : c,
        ),
      },
      series: [],
      security: null,
      canManage: true,
    });
    const verdict = healthVerdict(data);
    expect(verdict.tone).toBe("err");
    expect(verdict.title).toContain("Is Not Responding");
    expect(data.overallStatus).toBe("outage");
  });

  it("counts several troubled services together", () => {
    const base = summary();
    const data = buildDashboard({
      summary: {
        ...base,
        components: base.components.map((c) =>
          c.key === "storage" || c.key === "authentication"
            ? { ...c, last_outcome: "slow", last_status: "degraded", last_ms: 5000 }
            : c,
        ),
      },
      series: [],
      security: null,
      canManage: true,
    });
    expect(healthVerdict(data).title).toBe("2 Services Need Review");
  });

  it("warns when storage is nearly full", () => {
    const base = summary();
    const data = buildDashboard({
      summary: {
        ...base,
        components: base.components.map((c) =>
          c.key === "capacity" ? { ...c, capacity_bytes: 20_000_000, total_bytes: 18_000_000 } : c,
        ),
      },
      series: [],
      security: null,
      canManage: true,
    });
    const verdict = healthVerdict(data);
    expect(verdict.title).toBe("Storage Is Nearly Full");
    expect(verdict.body).toContain("90%");
    expect(verdict.body).toContain("19.1 MB");
  });

  it("mentions recent trouble without calling the platform degraded", () => {
    const verdict = healthVerdict(build(withStorage({ slow_n: 3, failed_n: 1 })));
    expect(verdict.tone).toBe("ok");
    expect(verdict.title).toBe("All Systems Operational");
    expect(verdict.body).toContain("Document storage had 4 slow or failed checks in the last 24 hours and is fine now.");
  });

  it("is honest when no schedule has run", () => {
    const verdict = healthVerdict(build({ monitor: null }));
    expect(verdict.tone).toBe("ok");
    expect(verdict.body).toContain("Scheduled checks have not run yet");
  });
});

describe("schedule wording", () => {
  it("finds the next quarter hour", () => {
    expect(nextScheduledRun("2026-10-24T06:46:30.000Z")).toBe("2026-10-24T07:00:00.000Z");
    expect(nextScheduledRun("2026-10-24T06:50:00.000Z")).toBe("2026-10-24T07:00:00.000Z");
    expect(nextScheduledRun("2026-10-24T06:00:00.000Z")).toBe("2026-10-24T06:15:00.000Z");
  });

  it("writes the header line for each monitor state", () => {
    expect(headerLine(build())).toBe("Checks run every 15 minutes · last 2:46 PM, next 3:00 PM");
    expect(headerLine(build({ monitor: null }))).toBe("No schedule is running yet · last check 2:46 PM");
    expect(
      headerLine(
        build({ monitor: { last_run_at: "2026-10-24T05:46:00.000Z", last_status: "succeeded", runs_24h: 1, ok_24h: 1 } }),
      ),
    ).toBe("Checks should run every 15 minutes · last run 1:46 PM, about 1 hour ago");
  });
});

describe("events", () => {
  const event = (patch: Record<string, unknown>) =>
    ({
      id: "e",
      componentKey: "storage",
      component: "Document storage",
      title: "t",
      summary: "",
      type: "degradation",
      severity: "warning",
      startedAt: "2026-10-24T06:00:00.000Z",
      resolvedAt: null,
      acknowledgedAt: null,
      acknowledgedByName: null,
      plannedStart: null,
      plannedEnd: null,
      relatedAuditEventId: null,
      ...patch,
    }) as Parameters<typeof isOpenIncident>[0];

  it("splits open, planned and history", () => {
    const open = event({});
    const closed = event({ resolvedAt: "2026-10-24T06:30:00.000Z" });
    const planned = event({ type: "maintenance", plannedStart: "2026-10-25T13:00:00.000Z", plannedEnd: "2026-10-25T13:30:00.000Z" });
    const past = event({ type: "maintenance", plannedStart: "2026-10-23T13:00:00.000Z", plannedEnd: "2026-10-23T13:30:00.000Z" });
    expect(isOpenIncident(open)).toBe(true);
    expect(isOpenIncident(closed)).toBe(false);
    expect(isPlanned(planned, NOW)).toBe(true);
    expect(isPlanned(past, NOW)).toBe(false);
    expect([open, closed, planned, past].filter((e) => isHistory(e, NOW))).toEqual([closed, past]);
  });
});

describe("helpers", () => {
  it("ranks the worst status", () => {
    expect(worstStatus(["operational", "degraded", "unknown"])).toBe("degraded");
    expect(worstStatus(["degraded", "outage"])).toBe("outage");
    expect(worstStatus([])).toBe("operational");
  });

  it("formats bytes in binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(17_196_646)).toBe("16.4 MB");
    expect(formatBytes(1_073_741_824)).toBe("1 GB");
  });

  it("writes a plain summary to paste into a message", () => {
    const text = summaryText(build());
    expect(text).toContain("System Health, 2:46 PM");
    expect(text).toContain("All Systems Operational");
    expect(text).toContain("Core database: 88 ms (limit 600 ms, 100% up in 24 hours)");
    expect(text).toContain("Storage used: 16.4 MB (182 objects)");
  });
});
