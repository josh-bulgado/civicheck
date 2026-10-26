import type { CheckOutcome, HealthCheck, ServiceHealth } from "./system-admin.types";

export type HealthHistoryStatus = CheckOutcome | "unknown";
export type HealthHistoryComponent = {
  key: string;
  name: string;
  status: HealthHistoryStatus;
  checks: number;
  passed: number;
  slow: number;
  failed: number;
  minResponseMs: number | null;
  maxResponseMs: number | null;
  lastCheckedAt: string | null;
};
export type HealthHistoryInterval = {
  from: string;
  to: string;
  status: HealthHistoryStatus;
  checks: number;
  passed: number;
  slow: number;
  failed: number;
  components: HealthHistoryComponent[];
};
type HistoryService = Pick<ServiceHealth, "key" | "checks"> & Partial<Pick<ServiceHealth, "name">>;
const INTERVAL_MS = 15 * 60_000;
const INTERVAL_COUNT = 96;
const rank: Record<CheckOutcome, number> = { ok: 0, slow: 1, failed: 2 };

/** Each interval reports the worst observed result across the core services.
 * Passing requires a reading from every service; missing history stays unknown. */
export function healthStatusHistory(services: HistoryService[], now: string): HealthHistoryInterval[] {
  const end = Date.parse(now);
  const start = end - INTERVAL_COUNT * INTERVAL_MS;
  const intervals = Array.from({ length: INTERVAL_COUNT }, () => new Map<string, HealthHistoryComponent>());
  const emptyComponent = (service: HistoryService): HealthHistoryComponent => ({
    key: service.key, name: service.name ?? service.key, status: "unknown",
    checks: 0, passed: 0, slow: 0, failed: 0,
    minResponseMs: null, maxResponseMs: null, lastCheckedAt: null,
  });
  for (const service of services) {
    for (const check of service.checks) {
      const at = Date.parse(check.at);
      if (!Number.isFinite(at) || at < start || at > end) continue;
      const index = Math.min(INTERVAL_COUNT - 1, Math.floor((at - start) / INTERVAL_MS));
      const result = intervals[index].get(service.key) ?? emptyComponent(service);
      if (result.status === "unknown" || rank[check.outcome] > rank[result.status]) result.status = check.outcome;
      result.checks += 1;
      result[check.outcome === "ok" ? "passed" : check.outcome] += 1;
      if (check.outcome !== "failed" && check.responseMs !== null && Number.isFinite(check.responseMs)) {
        result.minResponseMs = Math.min(result.minResponseMs ?? Infinity, check.responseMs);
        result.maxResponseMs = Math.max(result.maxResponseMs ?? -Infinity, check.responseMs);
      }
      if (!result.lastCheckedAt || at > Date.parse(result.lastCheckedAt)) result.lastCheckedAt = new Date(at).toISOString();
      intervals[index].set(service.key, result);
    }
  }
  return intervals.map((results, index) => {
    const components = services.map((service) => results.get(service.key) ?? emptyComponent(service));
    const outcomes = components.map((component) => component.status);
    const status: HealthHistoryStatus = outcomes.includes("failed") ? "failed"
      : outcomes.includes("slow") ? "slow"
      : services.length > 0 && results.size === services.length ? "ok" : "unknown";
    const totals = components.reduce((sum, component) => ({
      checks: sum.checks + component.checks, passed: sum.passed + component.passed,
      slow: sum.slow + component.slow, failed: sum.failed + component.failed,
    }), { checks: 0, passed: 0, slow: 0, failed: 0 });
    return { from: new Date(start + index * INTERVAL_MS).toISOString(), to: new Date(start + (index + 1) * INTERVAL_MS).toISOString(), status, ...totals, components };
  });
}

/** A recovery ends the streak; duplicate readings at the same time count once. */
export function consecutiveFailedChecks(checks: HealthCheck[]) {
  const unique = new Map<number, HealthCheck>();
  for (const check of checks) {
    const at = Date.parse(check.at);
    if (Number.isFinite(at)) unique.set(at, check);
  }
  const ordered = [...unique.entries()].sort(([a], [b]) => a - b);
  let count = 0;
  for (let index = ordered.length - 1; index >= 0 && ordered[index][1].outcome === "failed"; index -= 1) count += 1;
  return count;
}
