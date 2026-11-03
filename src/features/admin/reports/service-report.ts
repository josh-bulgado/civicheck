// Shared vocabulary and pure shaping helpers for the service report. Kept
// separate from `service-report.queries.ts` so the page and its cards can
// import them without pulling a server function into the client bundle.

import {
  ADDITIONAL_PURPOSES,
  PURPOSE_OPTIONS,
} from "~/features/forms/form-template.utils";

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

/** Philippine time is a fixed UTC+8: there is no daylight saving to account for. */
export const MANILA_OFFSET_MS = 8 * 60 * 60 * 1_000;

/**
 * Midnight Manila on the first of the calendar month `months - 1` back,
 * expressed as a UTC instant.
 *
 * The office's own clock is what a reporting period means to the CCRO, and the
 * Philippines has no DST — a fixed +08:00 offset is exact here, not an
 * approximation. Deriving the period in UTC instead would pull requests filed
 * before 08:00 Legazpi time into the wrong month.
 */
export function periodStart(now: Date, months: ReportPeriodMonths): Date {
  const manilaNow = new Date(now.getTime() + MANILA_OFFSET_MS);
  const firstOfMonth = Date.UTC(
    manilaNow.getUTCFullYear(),
    manilaNow.getUTCMonth() - (months - 1),
    1,
  );
  return new Date(firstOfMonth - MANILA_OFFSET_MS);
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

/** The fixed choices; anything else the applicant typed collapses to "Other". */
export const CANONICAL_PURPOSES = [
  ...PURPOSE_OPTIONS.map((option) => option.value),
  ...ADDITIONAL_PURPOSES,
];

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

const monthNameFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

/** "August" for 8: the full name, for sentences. The chart axes use the short one. */
export function monthName(month: number): string {
  return monthNameFormatter.format(new Date(Date.UTC(2000, month - 1, 1)));
}

/** "the last 12 months": a period as it reads inside a sentence. */
export function periodPhrase(months: ReportPeriodMonths): string {
  const label = REPORT_PERIODS.find((period) => period.months === months)?.label;
  return `the ${(label ?? `last ${months} months`).toLowerCase()}`;
}

/** The month with the most events (1–12), or null when every month is empty. */
export function seasonalityPeak(
  seasonality: ReadonlyArray<{ month: number; count: number }>,
): { month: number; count: number } | null {
  let peak: { month: number; count: number } | null = null;
  for (const bucket of seasonality) {
    if (bucket.count > (peak?.count ?? 0)) peak = bucket;
  }
  return peak;
}

/** Percentage of `total`, or null when there is nothing to divide by. */
export function shareOf(count: number, total: number): number | null {
  return total > 0 ? Math.round((count / total) * 1_000) / 10 : null;
}
