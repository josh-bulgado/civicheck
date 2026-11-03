import type { HealthEvent, ServiceHealth } from "./system-admin.types";
import type { HealthHistoryInterval, HealthHistoryStatus } from "./system-health-history.model";

/** Twenty-four hourly groups, preserving missing readings and the worst result. */
export function healthSummaryAvailability(intervals: HealthHistoryInterval[]) {
  return Array.from({ length: Math.ceil(intervals.length / 4) }, (_, index) => {
    const group = intervals.slice(index * 4, index * 4 + 4);
    const checks = group.reduce((sum, interval) => sum + interval.checks, 0);
    const passed = group.reduce((sum, interval) => sum + interval.passed, 0);
    const statuses = group.map((interval) => interval.status);
    const status: HealthHistoryStatus = statuses.includes("failed") ? "failed"
      : statuses.includes("slow") ? "slow" : statuses.includes("unknown") ? "unknown" : "ok";
    return { from: group[0].from, to: group[group.length - 1].to, status, checks, passed, percent: checks ? passed / checks * 100 : null };
  });
}

/** Use the same service and threshold as the headline. Failed intervals leave gaps. */
export function healthSummaryResponse(intervals: HealthHistoryInterval[], service: Pick<ServiceHealth, "key" | "slowAfterMs"> | null) {
  const values = intervals.map((interval) => {
    const component = interval.components.find((item) => item.key === service?.key);
    return component && component.status !== "failed" ? component.maxResponseMs : null;
  });
  const limitMs = service && Number.isFinite(service.slowAfterMs) && service.slowAfterMs > 0 ? service.slowAfterMs : null;
  const ceiling = Math.max(1, (limitMs ?? 0) * 1.2, ...values.flatMap((value) => value === null ? [] : [value]));
  const y = (value: number) => 46 - value / ceiling * 42;
  const segments: { line: string; area: string }[] = [];
  let points: { x: number; y: number }[] = [];
  function finishSegment() {
    if (!points.length) return;
    const first = points[0];
    const last = points[points.length - 1];
    const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
    segments.push({ line: points.length === 1 ? `${line} l0,0` : line, area: `${line} L${last.x.toFixed(2)},46 L${first.x.toFixed(2)},46 Z` });
    points = [];
  }
  values.forEach((value, index) => {
    if (value === null) finishSegment();
    else points.push({ x: index / Math.max(1, values.length - 1) * 240, y: y(value) });
  });
  finishSegment();
  return { segments, limitMs, limitY: limitMs === null ? null : y(limitMs) };
}

/** Calendar days in Philippine time; an incident counts on every day it overlaps. */
export function healthSummaryIncidents(events: Pick<HealthEvent, "type" | "severity" | "startedAt" | "resolvedAt">[], now: string) {
  const end = Date.parse(now);
  const dayMs = 24 * 60 * 60_000;
  const offsetMs = 8 * 60 * 60_000;
  const local = new Date(end + offsetMs);
  const today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs;
  const incidents = events.flatMap((event) => {
    const from = Date.parse(event.startedAt);
    const to = event.resolvedAt ? Date.parse(event.resolvedAt) : Infinity;
    return event.type === "degradation" && Number.isFinite(from) && from <= end && to >= from
      ? [{ from, to, critical: event.severity === "critical" }] : [];
  });
  return Array.from({ length: 7 }, (_, index) => {
    const from = today - (6 - index) * dayMs;
    const to = from + dayMs;
    const recorded = incidents.filter((incident) => incident.from < to && incident.to > from);
    return { from: new Date(from).toISOString(), count: recorded.length, tone: recorded.some((incident) => incident.critical) ? "error" : recorded.length ? "warning" : "none" };
  });
}
