// Date-range + export helpers for the payment history. Pure, so the route
// (client or server), the server function, and the page all agree on what
// "today" and a valid range mean.

import { toCsv } from "~/lib/csv";
import { OFFICE_TIME_ZONE, diffInDays, fromDateKey } from "~/lib/date";
import type { PaymentHistoryRow } from "./requests.queries";

// The CCRO is in Legazpi, so "a day" always means a Philippine day — never the
// server's or browser's local zone (Vercel runs in UTC, which would roll the
// day over at 8am).
const OFFICE_UTC_OFFSET = "+08:00";

/** Longest range a single report covers, in days. */
export const MAX_RANGE_DAYS = 366;

/** The date of a moment in the office's timezone, as YYYY-MM-DD. */
export function officeDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's date in the office's timezone, as YYYY-MM-DD. */
export function officeTodayKey(now: Date = new Date()): string {
  return officeDateKey(now);
}

export interface PaymentRange {
  from: string;
  to: string;
}

function addDays(key: string, days: number): string {
  const date = fromDateKey(key) as Date;
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Turns whatever came in (URL params, client input) into a usable range:
 * missing or invalid dates fall back to today, a reversed range is swapped,
 * and anything longer than a year is trimmed to end at `to`.
 */
export function normalizePaymentRange(from?: string, to?: string): PaymentRange {
  const today = officeTodayKey();
  let start = fromDateKey(from) ? (from as string) : null;
  let end = fromDateKey(to) ? (to as string) : null;

  // Only one end given → a single-day report for that day.
  start ??= end ?? today;
  end ??= start;
  if (start > end) [start, end] = [end, start];
  if (diffInDays(start, end) > MAX_RANGE_DAYS - 1) {
    start = addDays(end, -(MAX_RANGE_DAYS - 1));
  }
  return { from: start, to: end };
}

/** Inclusive instant bounds for a range, as ISO strings for the database. */
export function paymentRangeBounds({ from, to }: PaymentRange) {
  return {
    start: new Date(`${from}T00:00:00.000${OFFICE_UTC_OFFSET}`).toISOString(),
    end: new Date(`${to}T23:59:59.999${OFFICE_UTC_OFFSET}`).toISOString(),
  };
}

function formatOfficeDateTime(value: string) {
  return new Date(value).toLocaleString("en-CA", {
    timeZone: OFFICE_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(",", "");
}

export function paymentsToCsv(rows: PaymentHistoryRow[]): string {
  return toCsv(
    [
      "Tracking No.",
      "Applicant",
      "Service",
      "OR No.",
      "Fee (PHP)",
      "Verified At",
      "Verified By",
    ],
    rows.map((row) => [
      row.trackingNumber,
      row.applicantName,
      row.serviceName,
      row.orNumber ?? "",
      row.feesDue.toFixed(2),
      formatOfficeDateTime(row.verifiedAt),
      row.verifiedBy,
    ]),
  );
}

