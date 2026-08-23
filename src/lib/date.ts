/**
 * Local calendar date as YYYY-MM-DD.
 *
 * Not toISOString().slice(0, 10) — that converts to UTC first, which rolls the
 * date back a day for any timezone ahead of UTC (Philippines is UTC+8) during
 * local morning hours.
 */
export function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse a YYYY-MM-DD key into a local midnight Date, or null if unusable. */
export function fromDateKey(key: string | null | undefined): Date | null {
  if (!key) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // Rejects real-looking but invalid dates such as 2026-02-31, which the Date
  // constructor would silently roll forward into March.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** "August 16, 2026" — the format used on screen for a chosen date. */
export function formatDateKey(key: string | null | undefined): string {
  const date = fromDateKey(key);
  if (!date) return "";
  return date.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Adds months while keeping the day in range (31 Jan + 1 month -> 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  return next;
}

/** Whole days from `fromKey` to `toKey` (positive when `toKey` is later). Falls back to 0 for an unparsable key. */
export function diffInDays(fromKey: string, toKey: string): number {
  const from = fromDateKey(fromKey);
  const to = fromDateKey(toKey);
  if (!from || !to) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/** Age in whole years as of `asOfKey` (defaults to today). Falls back to 0 for an unparsable key. */
export function ageInYears(birthDateKey: string, asOfKey: string = toDateKey()): number {
  const birth = fromDateKey(birthDateKey);
  const asOf = fromDateKey(asOfKey);
  if (!birth || !asOf) return 0;
  let age = asOf.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    asOf.getMonth() > birth.getMonth() ||
    (asOf.getMonth() === birth.getMonth() && asOf.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return Math.max(age, 0);
}
