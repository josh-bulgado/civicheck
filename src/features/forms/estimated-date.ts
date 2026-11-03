export const UNKNOWN_DATE = "Registration date unknown";
export const ESTIMATE_PREFIX = "Estimated: ";

export function isEstimatedDate(value: string) {
  return value === UNKNOWN_DATE || value.startsWith(ESTIMATE_PREFIX);
}

export function validateEstimatedDate(value: string, today: string): true | string {
  if (value === UNKNOWN_DATE || value === ESTIMATE_PREFIX || !value.trim()) {
    return "Enter an estimated registration year or year range.";
  }
  const estimate = value.slice(ESTIMATE_PREFIX.length).trim();
  const match = /^(\d{4})(?:\s*[-–]\s*(\d{4}))?$/.exec(estimate);
  if (!match) return "Enter a year or year range, e.g. 2018 or 2015–2020.";
  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  if (start < 1 || end < start) return "Enter a valid year range with the earlier year first.";
  if (end > Number(today.slice(0, 4))) return "The estimated registration year cannot be in the future.";
  return true;
}
