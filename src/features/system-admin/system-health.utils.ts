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

/** Relative to the server's snapshot time, so the first client render matches SSR. */
export function healthTimeAgo(value: string | null, now: string) {
  if (!value) return "Never";
  const minutes = Math.max(0, Math.floor((new Date(now).getTime() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

const clockFormatter = new Intl.DateTimeFormat("en-PH", {
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

const sampleClockFormatter = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila",
});

export function formatHealthSampleClock(value: string) {
  return sampleClockFormatter.format(new Date(value));
}

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
