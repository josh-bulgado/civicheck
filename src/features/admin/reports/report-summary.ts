// The office-wide figures the Reports page tells in words: one definition of
// each, shared by the briefing, the report sheet and the copied summary.

import {
  MIN_SAMPLE,
  monthName,
  seasonalityPeak,
  shareOf,
} from "~/features/admin/reports/service-report";
import type { VolumeBucket } from "~/features/admin/reports/report-volume";
import type {
  ServiceReportData,
  ServiceReportRow,
} from "~/features/admin/reports/service-report.queries";
import { OFFICE_TIME_ZONE } from "~/lib/date";

/** An average built on fewer releases than this is a warning, not a finding. */
export const THIN_RELEASE_SAMPLE = 5;

/** A service behind more than this share of releases drives the office average. */
const DOMINANT_SHARE = 0.5;

export interface ServiceShare {
  label: string;
  /** Requests (or releases, for the dominant service) it accounts for. */
  count: number;
  /** Percent of the office total, one decimal. */
  percent: number | null;
}

export interface OfficeSummary {
  requests: number;
  released: number;
  open: number;
  rejected: number;
  /** Requests marked incomplete at least once. */
  sentBack: number;
  releasedPercent: number | null;
  sentBackPercent: number | null;
  /** Calendar days from submission to release, weighted by each service's releases. */
  avgDays: number | null;
  releaseSample: number;
  topService: ServiceShare | null;
  /** The service behind most releases, when one service is most of the average. */
  dominantRelease: ServiceShare | null;
}

/**
 * The office average has to weight each service by how many releases it
 * contributed: averaging the per-service averages would let a service with a
 * single release count as much as one with seventeen.
 */
export function weightedAverageDays(
  services: ReadonlyArray<Pick<ServiceReportRow, "avgReleaseDays" | "releaseSample">>,
): number | null {
  let days = 0;
  let sample = 0;
  for (const { avgReleaseDays, releaseSample } of services) {
    if (avgReleaseDays === null || releaseSample <= 0) continue;
    days += avgReleaseDays * releaseSample;
    sample += releaseSample;
  }
  return sample > 0 ? Math.round((days / sample) * 10) / 10 : null;
}

export function summarizeOffice({
  totals,
  services,
}: Pick<ServiceReportData, "totals" | "services">): OfficeSummary {
  const releaseSample = services.reduce((sum, row) => sum + row.releaseSample, 0);

  let top: ServiceReportRow | null = null;
  let mostReleased: ServiceReportRow | null = null;
  for (const row of services) {
    if (row.total > (top?.total ?? 0)) top = row;
    if (row.releaseSample > (mostReleased?.releaseSample ?? 0)) mostReleased = row;
  }

  return {
    requests: totals.requests,
    released: totals.released,
    open: totals.pending,
    rejected: totals.rejected,
    sentBack: totals.incomplete,
    releasedPercent: shareOf(totals.released, totals.requests),
    sentBackPercent: shareOf(totals.incomplete, totals.requests),
    avgDays: weightedAverageDays(services),
    releaseSample,
    topService: top
      ? { label: top.label, count: top.total, percent: shareOf(top.total, totals.requests) }
      : null,
    dominantRelease:
      mostReleased && mostReleased.releaseSample / releaseSample > DOMINANT_SHARE
        ? {
            label: mostReleased.label,
            count: mostReleased.releaseSample,
            percent: shareOf(mostReleased.releaseSample, releaseSample),
          }
        : null,
  };
}

/** "Same day", "1 day", "12.1 days", or a dash when nothing has been released. */
export function formatDays(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Same day";
  if (days === 1) return "1 day";
  return `${Number.isInteger(days) ? days : days.toFixed(1)} days`;
}

const countFormatter = new Intl.NumberFormat("en-PH");
export const formatCount = (value: number) => countFormatter.format(value);

export function pluralize(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}

const generatedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: OFFICE_TIME_ZONE,
});

/**
 * "Oct 23, 2026, 1:29 PM", on the office's clock whichever machine renders it.
 *
 * Assembled from the formatter's parts rather than taking its `dateStyle` text:
 * Safari writes "Oct 23, 2026 at 1:29 PM" where Node writes a comma, and a label
 * that differs between the server and the browser breaks hydration.
 */
export function formatGeneratedAt(iso: string): string {
  const part = new Map(
    generatedAtFormatter.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]),
  );
  return `${part.get("month")} ${part.get("day")}, ${part.get("year")}, ${part.get("hour")}:${part.get("minute")} ${part.get("dayPeriod")}`;
}

/**
 * The busy season in a sentence, for the service the report profiled. Null when
 * there are too few dated requests to call any month busy.
 */
export function describeBusySeason({
  insight,
  selectedService,
}: Pick<ServiceReportData, "insight" | "selectedService">): string | null {
  if (!selectedService || insight.eventDated < MIN_SAMPLE) return null;
  const peak = seasonalityPeak(insight.seasonality);
  if (!peak) return null;
  const event = (selectedService.eventDateLabel ?? "date of event").toLowerCase();
  return `For ${selectedService.label}, the most common ${event} falls in ${monthName(peak.month)} (${formatCount(peak.count)} of ${formatCount(insight.eventDated)}).`;
}

interface SummaryTextInput {
  summary: OfficeSummary;
  periodLabel: string;
  busiest: VolumeBucket | null;
  generatedLabel: string;
}

/** The report in plain text, for pasting into a message or an email. */
export function buildSummaryText({
  summary,
  periodLabel,
  busiest,
  generatedLabel,
}: SummaryTextInput): string {
  const lines = [
    "CITY CIVIL REGISTRAR OFFICE · City Government of Legazpi",
    `Operational Report: ${periodLabel}`,
    "",
    `• ${formatCount(summary.requests)} ${pluralize(summary.requests, "request")} received`,
  ];

  if (summary.requests > 0) {
    const days =
      summary.avgDays === null ? "" : `, average ${formatDays(summary.avgDays)}`;
    lines.push(
      `• ${formatCount(summary.released)} released (${summary.releasedPercent}%)${days}`,
      `• ${formatCount(summary.open)} still open`,
      `• ${formatCount(summary.rejected)} rejected`,
      `• ${formatCount(summary.sentBack)} sent back for missing papers (${summary.sentBackPercent}%)`,
    );
  }
  if (busiest) {
    lines.push("", `Busiest month: ${busiest.label} (${formatCount(busiest.count)} requests)`);
  }
  if (summary.topService) {
    lines.push(
      `Most requested: ${summary.topService.label} (${formatCount(summary.topService.count)}, ${summary.topService.percent}%)`,
    );
  }
  lines.push("", `Generated from CiviCheck on ${generatedLabel}`);
  return lines.join("\n");
}
