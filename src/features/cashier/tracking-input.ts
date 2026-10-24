import { officeTodayKey } from "~/features/requests/payment-history";

// Tracking numbers are minted as `CCRO-<year>-<6 random digits>` (see
// requests/tracking-number.ts). The year is the year of submission, so a
// request filed in December can still reach the counter in January with last
// year's number.

const FULL_NUMBER = /^CCRO-?(\d{4})-?(\d{6})$/;
const DIGITS_ONLY = /^[\d-]+$/;

export const TRACKING_SUFFIX_LENGTH = 6;

/** What the tracking field currently holds, and how to look it up. */
export type TrackingQuery =
  | { kind: "incomplete" }
  /** A whole number (typed, pasted or scanned): exactly one request can match. */
  | { kind: "exact"; candidates: [string] }
  /** Only the 6 digits: the year is unknown, so this year and last year are tried. */
  | { kind: "digits"; candidates: string[] };

export function formatTrackingNumber(year: number | string, digits: string): string {
  return `CCRO-${year}-${digits}`;
}

/**
 * The years a 6-digit lookup tries, newest first: the current year on the
 * office's Philippine calendar, then the one before it. A server in UTC can
 * stamp a number filed just after midnight on 1 January with the old year,
 * so the previous year is always in the window.
 */
export function lookupYears(now: Date = new Date()): number[] {
  const year = Number(officeTodayKey(now).slice(0, 4));
  return [year, year - 1];
}

/**
 * Reads the field. Anything with letters in it is a number still being typed
 * or pasted, so a keyboard-style barcode scanner that "types" `CCRO-2026-8…`
 * one character at a time is never mistaken for 6 bare digits halfway through.
 */
export function parseTrackingInput(raw: string, years: number[] = lookupYears()): TrackingQuery {
  const text = raw.trim().toUpperCase().replace(/\s+/g, "");

  const full = FULL_NUMBER.exec(text);
  if (full) return { kind: "exact", candidates: [formatTrackingNumber(full[1], full[2])] };

  if (!DIGITS_ONLY.test(text)) return { kind: "incomplete" };

  const digits = text.replaceAll("-", "");
  if (digits.length === TRACKING_SUFFIX_LENGTH) {
    return { kind: "digits", candidates: years.map((year) => formatTrackingNumber(year, digits)) };
  }
  if (digits.length === 4 + TRACKING_SUFFIX_LENGTH) {
    return { kind: "exact", candidates: [formatTrackingNumber(digits.slice(0, 4), digits.slice(4))] };
  }
  return { kind: "incomplete" };
}

/** The year segment of a tracking number, or null if it does not have one. */
export function trackingYear(trackingNumber: string): number | null {
  const match = FULL_NUMBER.exec(trackingNumber);
  return match ? Number(match[1]) : null;
}

/**
 * What the field accepts as the cashier types. Digits (and the dashes of a
 * pasted number) always go in. Letters go in only while they spell `CCRO`, so a
 * scanner or a pasted whole number still works but a stray letter is ignored
 * instead of flipping the field out of digits mode. A rejected edit returns the
 * previous value.
 */
export function acceptTrackingInput(next: string, previous: string): string {
  const text = next.toUpperCase().replace(/\s+/g, "");
  if (/^[\d-]*$/.test(text)) return next;
  if (text.startsWith("CCRO") || "CCRO".startsWith(text)) return next;
  return previous;
}

/**
 * Whether the field is in "just the digits" mode, where the `CCRO-<year>-`
 * prefix is drawn for the cashier instead of typed.
 */
export function isDigitsMode(raw: string): boolean {
  return !/[a-z]/i.test(raw);
}
