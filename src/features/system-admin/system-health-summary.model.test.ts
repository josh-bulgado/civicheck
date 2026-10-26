import { describe, expect, it } from "vitest";
import type { HealthCheck, HealthEvent } from "./system-admin.types";
import { healthStatusHistory } from "./system-health-history.model";
import { healthSummaryAvailability, healthSummaryIncidents, healthSummaryResponse } from "./system-health-summary.model";

const NOW = "2026-10-27T01:00:00.000Z";
const check = (at: string, outcome: HealthCheck["outcome"] = "ok"): HealthCheck => ({ at, outcome, responseMs: outcome === "failed" ? null : outcome === "slow" ? 800 : 200 });
type Incident = Pick<HealthEvent, "type" | "severity" | "startedAt" | "resolvedAt">;
const incident = (startedAt: string, resolvedAt: string | null = null): Incident => ({ type: "degradation", severity: "warning", startedAt, resolvedAt });

describe("summary availability", () => {
  it("keeps missing hours unknown and never manufactures passing checks", () => {
    const bars = healthSummaryAvailability(healthStatusHistory([{ key: "database", checks: [check(NOW)] }], NOW));
    expect(bars).toHaveLength(24);
    expect(bars[0]).toMatchObject({ checks: 0, percent: null, status: "unknown" });
    expect(bars.at(-1)).toMatchObject({ checks: 1, percent: 100, status: "unknown" });
  });

  it("uses actual check totals and retains a failure alongside later recovery", () => {
    const bars = healthSummaryAvailability(healthStatusHistory([{ key: "database", checks: [check("2026-10-27T00:20:00Z", "failed"), check("2026-10-27T00:40:00Z", "slow"), check(NOW)] }], NOW));
    expect(bars.at(-1)).toMatchObject({ checks: 3, passed: 1, status: "failed" });
    expect(bars.at(-1)?.percent).toBeCloseTo(100 / 3);
  });
});

describe("summary response", () => {
  it("uses the selected service limit and splits the line at failed checks", () => {
    const history = healthStatusHistory([
      { key: "database", checks: [check("2026-10-27T00:20:00Z"), check("2026-10-27T00:35:00Z", "failed"), check(NOW)] },
      { key: "authentication", checks: [check("2026-10-27T00:35:00Z")] },
    ], NOW);
    const plot = healthSummaryResponse(history, { key: "database", slowAfterMs: 600 });
    expect(plot.limitMs).toBe(600);
    expect(plot.limitY).toBeCloseTo(11);
    expect(plot.segments).toHaveLength(2);
  });

  it("leaves an empty chart empty instead of turning missing readings into zero", () => {
    expect(healthSummaryResponse(healthStatusHistory([], NOW), null)).toEqual({ segments: [], limitMs: null, limitY: null });
  });
});

describe("seven-day incident summary", () => {
  it("uses Philippine midnight and excludes an incident resolved exactly at the next day", () => {
    const days = healthSummaryIncidents([incident("2026-10-26T15:59:00Z", "2026-10-26T16:00:00Z")], NOW);
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ from: "2026-10-26T16:00:00.000Z", count: 0, tone: "none" });
    expect(days[5]).toMatchObject({ count: 1, tone: "warning" });
  });

  it("shows a critical incident on every day it spans, including older open incidents", () => {
    const days = healthSummaryIncidents([{ ...incident("2026-10-01T00:00:00Z"), severity: "critical" }], NOW);
    expect(days.every((day) => day.count === 1 && day.tone === "error")).toBe(true);
  });

  it("excludes maintenance, recoveries, future incidents and invalid dates", () => {
    const days = healthSummaryIncidents([
      { ...incident(NOW), type: "maintenance" }, { ...incident(NOW), type: "recovery" },
      incident("2026-10-27T02:00:00Z"), incident("invalid"),
    ], NOW);
    expect(days.every((day) => day.count === 0 && day.tone === "none")).toBe(true);
  });
});
