/**
 * Local calendar date as YYYY-MM-DD.
 *
 * Not toISOString().slice(0, 10) — that converts to UTC first, which rolls the
 * date back a day for any timezone ahead of UTC (Philippines is UTC+8) during
 * local morning hours. The queue is keyed on the office's calendar day.
 */
export function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
