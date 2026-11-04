import { diffInDays, formatDateKey, fromDateKey, OFFICE_TIME_ZONE } from "~/lib/date";

export function needsMarriagePosting(serviceCode?: string | null) {
  return ["MARRIAGE_DELAYED", "DEATH_DELAYED", "MARRIAGE_LICENSE"].includes(serviceCode?.toUpperCase() ?? "");
}

export function postingToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

// Exclude the posting date, then count ten calendar days, including holidays.
export function marriagePostingEnd(start?: string | null): string | null {
  if (!fromDateKey(start)) return null;
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 10);
  return date.toISOString().slice(0, 10);
}

export function marriagePostingBlockedReason(start?: string | null, today = postingToday()) {
  const end = marriagePostingEnd(start);
  if (!end) return "Record the actual notice-posting date first.";
  if (start! > today) return "The posting date cannot be in the future.";
  if (today < end) return `The 10-day posting period ends on ${formatDateKey(end)}.`;
  return undefined;
}

export function marriagePostingMessage(start?: string | null, today = postingToday(), serviceCode?: string | null) {
  const end = marriagePostingEnd(start);
  if (!end) return "Waiting for staff to record the actual notice-posting date.";
  const remaining = Math.max(0, diffInDays(today, end));
  return remaining > 0
    ? `${remaining} calendar ${remaining === 1 ? "day" : "days"} remaining in the posting period.`
    : serviceCode?.toUpperCase() === "MARRIAGE_LICENSE"
      ? "Posting period complete. Staff must confirm all marriage-license requirements before issuance."
      : "Posting period complete. Staff must finish registration and signing before release.";
}
