import { diffInDays, fromDateKey } from "~/lib/date";
import { todayKeyInTimeZone } from "~/features/forms/form-template.utils";

export function marriageLicenseDateTooSoon(serviceCode: string, date: string, today = todayKeyInTimeZone()) {
  if (serviceCode !== "MARRIAGE_LICENSE" || !fromDateKey(date)) return false;
  const days = diffInDays(today, date);
  return days >= 0 && days < 10;
}
