import { describe, expect, it } from "vitest";
import type { UTCTimestamp } from "lightweight-charts";
import { healthChartPoints, healthChartStats, planHealthChartUpdate } from "./system-health-chart.model";

const point = (time: number, value?: number) => ({ time: time as UTCTimestamp, ...(value === undefined ? {} : { value }) });

describe("chart updates", () => {
  it("appends only new readings and updates a corrected latest point", () => {
    const previous = [point(1, 10), point(2, 20)];
    const next = [point(1, 10), point(2, 25), point(3, 30)];
    const plan = planHealthChartUpdate(previous, next);
    expect(plan.reset).toBe(false);
    expect(plan.updates).toEqual(next.slice(1));
    expect(plan.retained).toEqual(next);
  });
  it("keeps rolling windows incremental when the oldest session sample expires", () => {
    const previous = [point(1, 10), point(2, 20), point(3, 30)];
    const plan = planHealthChartUpdate(previous, [point(2, 20), point(3, 30), point(4, 40)]);
    expect(plan.reset).toBe(false);
    expect(plan.updates).toEqual([point(4, 40)]);
    expect(plan.retained).toEqual([...previous, point(4, 40)]);
  });
  it("does no chart work for unchanged readings, including failed checks", () => {
    const previous = [point(1, 10), point(2)];
    const plan = planHealthChartUpdate(previous, [point(1, 10), point(2)]);
    expect(plan.reset).toBe(false);
    expect(plan.updates).toHaveLength(0);
    expect(plan.retained).toBe(previous);
  });
  it("reloads when a historical reading changes instead of silently keeping stale history", () => {
    const next = [point(1, 15), point(2, 20)];
    const plan = planHealthChartUpdate([point(1, 10), point(2, 20)], next);
    expect(plan.reset).toBe(true);
    expect(plan.retained).toEqual(next);
  });
  it("bounds retained data while avoiding full reloads on each tick in a long session", () => {
    let retained = [point(0, 10)];
    let reloads = 0;
    for (let tick = 1; tick <= 100; tick += 1) {
      const incoming = Array.from({ length: Math.min(tick + 1, 4) }, (_, index) => point(Math.max(0, tick - 3) + index, 10));
      const plan = planHealthChartUpdate(retained, incoming, 8);
      retained = plan.retained;
      reloads += Number(plan.reset);
      expect(retained.length).toBeLessThanOrEqual(8);
    }
    expect(reloads).toBeLessThan(25);
    expect(retained.at(-1)?.time).toBe(100);
  });
  it("orders, deduplicates and excludes failed checks from range statistics", () => {
    const points = healthChartPoints([
      { at: "2026-10-26T12:00:05Z", responseMs: 20, outcome: "ok" },
      { at: "2026-10-26T12:00:00Z", responseMs: 10, outcome: "ok" },
      { at: "2026-10-26T12:00:05.500Z", responseMs: 25, outcome: "ok" },
      { at: "2026-10-26T12:00:10Z", responseMs: null, outcome: "failed" },
    ]);
    expect(points).toHaveLength(3);
    expect(points[1].value).toBe(25);
    expect(healthChartStats(points, 6)).toEqual({ low: 25, high: 25, count: 1 });
    expect(healthChartStats(points, 3)).toEqual({ low: null, high: null, count: 0 });
  });
});
