// Shared vocabulary and pure shaping helpers for the service report. Kept
// separate from `service-report.queries.ts` so the page and its cards can
// import them without pulling a server function into the client bundle.

import { PURPOSE_OPTIONS } from "~/features/forms/form-template.utils";

/**
 * Below this many requests a breakdown is not rendered at all.
 *
 * Two reasons, both non-negotiable. A distribution over three requests
 * describes those three people, not a trend — showing it invites the reader to
 * conclude something the data cannot support. And in an office this size, a
 * cell containing one or two requests is a re-identification risk once it is
 * crossed with a service and a month.
 */
export const MIN_SAMPLE = 10;

export const REPORT_PERIODS = [
  { months: 6, label: "Last 6 months" },
  { months: 12, label: "Last 12 months" },
  { months: 36, label: "Last 3 years" },
] as const;

export type ReportPeriodMonths = (typeof REPORT_PERIODS)[number]["months"];

export const DEFAULT_REPORT_MONTHS: ReportPeriodMonths = 12;

export function isReportPeriodMonths(value: unknown): value is ReportPeriodMonths {
  return REPORT_PERIODS.some((period) => period.months === Number(value));
}

/** Short month names, indexed 1–12 to match `extract(month from ...)`. */
export const MONTH_ABBREVIATIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * How long after the event the request was filed. `upcoming` is the negative
 * case — the event has not happened yet, which is normal for a marriage
 * licence and impossible for anything else.
 */
export const LAG_BUCKETS = [
  { key: "upcoming", label: "Not yet occurred" },
  { key: "same_day", label: "Same day" },
  { key: "within_30d", label: "Within 30 days" },
  { key: "within_1y", label: "1 month – 1 year" },
  { key: "within_5y", label: "1 – 5 years" },
  { key: "within_18y", label: "5 – 18 years" },
  { key: "over_18y", label: "Over 18 years" },
] as const;

/** The six fixed choices; anything else the applicant typed collapses to "Other". */
export const CANONICAL_PURPOSES = PURPOSE_OPTIONS.map((option) => option.value);

export const SEX_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
};

/**
 * Fold a free-text purpose tally onto the canonical list. `form_data->>'purpose'`
 * stores the applicant's own words when they picked "Other", so the stored
 * vocabulary is open-ended and cannot be charted directly.
 */
export function groupPurposes(
  tally: Record<string, number>,
): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  let other = 0;

  for (const [purpose, count] of Object.entries(tally)) {
    if (CANONICAL_PURPOSES.includes(purpose) && purpose !== "Other") {
      counts.set(purpose, (counts.get(purpose) ?? 0) + count);
    } else {
      other += count;
    }
  }

  const rows = CANONICAL_PURPOSES.filter((purpose) => purpose !== "Other")
    .map((label) => ({ label, count: counts.get(label) ?? 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return other > 0 ? [...rows, { label: "Other", count: other }] : rows;
}

/** Percentage of `total`, or null when there is nothing to divide by. */
export function shareOf(count: number, total: number): number | null {
  return total > 0 ? Math.round((count / total) * 1_000) / 10 : null;
}
