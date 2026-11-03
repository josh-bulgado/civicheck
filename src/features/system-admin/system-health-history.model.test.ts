import { describe, expect, it } from "vitest";
import type { HealthCheck } from "./system-admin.types";
import { consecutiveFailedChecks, healthStatusHistory } from "./system-health-history.model";

const NOW = "2026-10-27T01:00:00.000Z";
const check = (at: string, outcome: HealthCheck["outcome"] = "ok"): HealthCheck => ({ at, outcome, responseMs: outcome === "failed" ? null : 100 });

describe("24-hour status history", () => {
  it("keeps empty periods unknown instead of implying the system passed", () => {
    const history = healthStatusHistory([], NOW);
    expect(history).toHaveLength(96);
    expect(history[0].from).toBe("2026-10-26T01:00:00.000Z");
    expect(history.at(-1)?.to).toBe(NOW);
    expect(history.every((interval) => interval.status === "unknown")).toBe(true);
  });

  it("requires readings from every service before an interval passes", () => {
    const history = healthStatusHistory([
      { key: "database", checks: [check(NOW), check("2026-10-27T00:40:00Z")] },
      { key: "authentication", checks: [check(NOW)] },
    ], NOW);
    expect(history.at(-1)?.status).toBe("ok");
    expect(history.at(-2)?.status).toBe("unknown");
  });

  it("retains a failure after recovery in the same interval and prioritizes it over slow checks", () => {
    const history = healthStatusHistory([
      { key: "database", checks: [check("2026-10-27T00:50:00Z", "failed"), check(NOW)] },
      { key: "authentication", checks: [check(NOW, "slow")] },
    ], NOW);
    expect(history.at(-1)?.status).toBe("failed");
  });

  it("includes the window boundaries and ignores future, invalid and expired readings", () => {
    const history = healthStatusHistory([{ key: "database", checks: [
      check("2026-10-26T01:00:00Z", "slow"), check(NOW),
      check("2026-10-26T00:59:59Z", "failed"), check("2026-10-27T01:00:01Z", "failed"), check("invalid", "failed"),
    ] }], NOW);
    expect(history[0].status).toBe("slow");
    expect(history.at(-1)?.status).toBe("ok");
    expect(history.filter((interval) => interval.status !== "unknown")).toHaveLength(2);
  });

  it("keeps component counts, measured response ranges and the latest check for tooltip details", () => {
    const history = healthStatusHistory([
      { key: "database", name: "Core database", checks: [
        { at: "2026-10-27T00:55:00Z", outcome: "slow", responseMs: 800 },
        { at: NOW, outcome: "failed", responseMs: null },
        { at: "2026-10-27T00:50:00Z", outcome: "ok", responseMs: 100 },
      ] },
      { key: "authentication", name: "Authentication", checks: [] },
    ], NOW);
    expect(history.at(-1)).toMatchObject({ checks: 3, passed: 1, slow: 1, failed: 1, status: "failed" });
    expect(history.at(-1)?.components).toEqual([
      { key: "database", name: "Core database", status: "failed", checks: 3, passed: 1, slow: 1, failed: 1, minResponseMs: 100, maxResponseMs: 800, lastCheckedAt: NOW },
      { key: "authentication", name: "Authentication", status: "unknown", checks: 0, passed: 0, slow: 0, failed: 0, minResponseMs: null, maxResponseMs: null, lastCheckedAt: null },
    ]);
  });
});

describe("consecutive failed checks", () => {
  it("sorts and deduplicates readings while counting only the current failed streak", () => {
    const checks = [check(NOW, "failed"), check("2026-10-27T00:30:00Z", "failed"), check("2026-10-27T00:40:00Z"), check("2026-10-27T00:50:00Z", "failed"), check(NOW, "failed")];
    expect(consecutiveFailedChecks(checks)).toBe(2);
    expect(consecutiveFailedChecks([...checks, check("2026-10-27T01:01:00Z")])).toBe(0);
    expect(consecutiveFailedChecks([])).toBe(0);
  });
});
