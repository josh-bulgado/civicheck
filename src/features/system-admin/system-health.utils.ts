const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

const countFormatter = new Intl.NumberFormat("en-PH");

const percentFormatter = new Intl.NumberFormat("en-PH", {
  maximumFractionDigits: 2,
});

export function formatHealthTimestamp(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatHealthPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

export function formatResponseTime(value: number | null) {
  if (value === null) return "Unavailable";
  return value < 1 ? "<1 ms" : `${countFormatter.format(value)} ms`;
}

const clockFormatter = new Intl.DateTimeFormat("en-PH", {
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

/** A time of day in the office's time zone, such as "2:46 PM". */
export function formatHealthClock(value: string) {
  return clockFormatter.format(new Date(value));
}

/** Binary units, one decimal at most: 16.4 MB, 1 GB. */
export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${Number(value.toFixed(unit === 0 ? 0 : 1))} ${units[unit]}`;
}

/** "1 open finding", "0 open findings". */
export function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
