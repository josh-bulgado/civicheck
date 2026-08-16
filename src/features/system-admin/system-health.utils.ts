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

export function formatHealthCount(value: number) {
  return countFormatter.format(value);
}

export function formatHealthPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

export function formatResponseTime(value: number | null) {
  if (value === null) return "Unavailable";
  return value < 1 ? "<1 ms" : `${countFormatter.format(value)} ms`;
}
