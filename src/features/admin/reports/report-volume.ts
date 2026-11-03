// Requests per month (per quarter for the longest period), on the office's
// calendar. Pure, so the server function and the tests agree on what a month is.

import {
  MANILA_OFFSET_MS,
  MONTH_ABBREVIATIONS,
  periodStart,
  type ReportPeriodMonths,
} from "~/features/admin/reports/service-report";

export interface VolumeBucket {
  key: string;
  label: string;
  count: number;
  /** The bucket that holds today, so it is still filling up. */
  current: boolean;
}

export interface VolumeRow {
  key: string;
  label: string;
  count: number;
  /** A stretch of empty buckets shown as one line instead of a column of zeros. */
  gap: boolean;
  busiest: boolean;
  current: boolean;
}

/** Past a year, a month per row is too many to read, so rows become quarters. */
const QUARTERLY_ABOVE_MONTHS = 12;

/** Empty buckets at the start of a period collapse once there are this many. */
const MIN_GAP = 3;

function manilaCalendar(ms: number) {
  const date = new Date(ms + MANILA_OFFSET_MS);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function bucketOf(year: number, month: number, quarterly: boolean) {
  if (quarterly) {
    const quarter = Math.floor(month / 3) + 1;
    return { key: `${year}-Q${quarter}`, label: `Q${quarter} ${year}` };
  }
  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    label: `${MONTH_ABBREVIATIONS[month]} ${year}`,
  };
}

/**
 * Counts requests per bucket across the period ending today. Every bucket in
 * the period is present, empty ones included, oldest first.
 */
export function bucketRequestVolume(
  createdAt: readonly string[],
  months: ReportPeriodMonths,
  now: Date,
): VolumeBucket[] {
  const start = periodStart(now, months);
  const first = manilaCalendar(start.getTime());
  const quarterly = months > QUARTERLY_ABOVE_MONTHS;

  const buckets = new Map<string, VolumeBucket>();
  for (let offset = 0; offset < months; offset += 1) {
    const monthIndex = first.month + offset;
    const { key, label } = bucketOf(
      first.year + Math.floor(monthIndex / 12),
      monthIndex % 12,
      quarterly,
    );
    if (!buckets.has(key)) buckets.set(key, { key, label, count: 0, current: false });
  }

  for (const stamp of createdAt) {
    const ms = Date.parse(stamp);
    if (Number.isNaN(ms) || ms < start.getTime()) continue;
    const { year, month } = manilaCalendar(ms);
    const bucket = buckets.get(bucketOf(year, month, quarterly).key);
    if (bucket) bucket.count += 1;
  }

  const ordered = Array.from(buckets.values());
  const last = ordered[ordered.length - 1];
  if (last) last.current = true;
  return ordered;
}

/** The bucket with the most requests, or null when nothing was requested. */
export function busiestBucket(buckets: readonly VolumeBucket[]): VolumeBucket | null {
  let best: VolumeBucket | null = null;
  for (const bucket of buckets) {
    if (bucket.count > (best?.count ?? 0)) best = bucket;
  }
  return best;
}

/** Rows for a bar list: a long empty start becomes one "no requests" line. */
export function volumeRows(buckets: readonly VolumeBucket[]): VolumeRow[] {
  const busiest = busiestBucket(buckets);
  let leadingEmpty = 0;
  while (leadingEmpty < buckets.length && buckets[leadingEmpty].count === 0) {
    leadingEmpty += 1;
  }

  const rows: VolumeRow[] = [];
  let from = 0;
  if (leadingEmpty >= MIN_GAP && leadingEmpty < buckets.length) {
    const first = buckets[0];
    const last = buckets[leadingEmpty - 1];
    rows.push({
      key: `${first.key}..${last.key}`,
      label: `${first.label} to ${last.label}`,
      count: 0,
      gap: true,
      busiest: false,
      current: false,
    });
    from = leadingEmpty;
  }

  for (const bucket of buckets.slice(from)) {
    rows.push({
      key: bucket.key,
      label: bucket.label,
      count: bucket.count,
      gap: false,
      busiest: bucket.key === busiest?.key,
      current: bucket.current,
    });
  }
  return rows;
}
