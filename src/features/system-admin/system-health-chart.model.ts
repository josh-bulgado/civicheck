import type { UTCTimestamp } from "lightweight-charts";
import type { HealthCheck } from "./system-admin.types";

export type HealthChartPoint = { time: UTCTimestamp; value?: number };
export const MAX_CHART_POINTS = 4096;

/** Missing response times mark failed periods, without inventing a latency. */
export function healthChartFailureWindows(points: HealthChartPoint[]) {
  const windows: { from: UTCTimestamp; to: UTCTimestamp }[] = [];
  let from: UTCTimestamp | undefined;
  for (const point of points) {
    if (point.value === undefined && from === undefined) from = point.time;
    if (point.value !== undefined && from !== undefined) {
      windows.push({ from, to: point.time });
      from = undefined;
    }
  }
  const last = points.at(-1);
  if (from !== undefined && last) windows.push({ from, to: last.time });
  return windows;
}

/** Readings are normally ordered. Only sort when a loader supplies older data. */
export function healthChartPoints(checks: HealthCheck[]): HealthChartPoint[] {
  const unique = new Map<number, HealthChartPoint>();
  let previousTime = -Infinity;
  let ordered = true;
  for (const check of checks) {
    const time = Math.floor(Date.parse(check.at) / 1000) as UTCTimestamp;
    if (!Number.isFinite(time)) continue;
    if (time < previousTime) ordered = false;
    previousTime = time;
    unique.set(time, check.responseMs === null ? { time } : { time, value: check.responseMs });
  }
  const points = [...unique.values()];
  return ordered ? points : points.sort((a, b) => a.time - b.time);
}

/** Keep rolling session windows on the incremental update path. Old points are
 * compacted occasionally, rather than resetting the chart on every new sample. */
export function planHealthChartUpdate(
  previous: HealthChartPoint[],
  incoming: HealthChartPoint[],
  maxPoints = MAX_CHART_POINTS,
): { reset: boolean; retained: HealthChartPoint[]; updates: HealthChartPoint[] } {
  const reset = () => ({ reset: true, retained: incoming.slice(-maxPoints), updates: [] });
  const last = previous.at(-1);
  if (!last || !incoming.length || incoming[incoming.length - 1].time < last.time) return reset();

  const existing = new Map(previous.map((point) => [point.time, point]));
  const updates: HealthChartPoint[] = [];
  for (const point of incoming) {
    const old = existing.get(point.time);
    if (point.time < last.time) {
      if (!old || point.value !== old.value) return reset();
    } else if (!old || point.value !== old.value) updates.push(point);
  }
  if (!updates.length) return { reset: false, retained: previous, updates };
  const retained = updates[0].time === last.time ? previous.slice(0, -1).concat(updates) : previous.concat(updates);
  return retained.length > maxPoints ? reset() : { reset: false, retained, updates };
}

export function healthChartStats(points: HealthChartPoint[], seconds: number) {
  const start = (points.at(-1)?.time ?? 0) - seconds;
  let low = Infinity;
  let high = -Infinity;
  let count = 0;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point.time < start) break;
    if (point.value === undefined) continue;
    low = Math.min(low, point.value);
    high = Math.max(high, point.value);
    count += 1;
  }
  return { low: count ? low : null, high: count ? high : null, count };
}
