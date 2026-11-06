import { diffInDays, toDateKey } from "~/lib/date";

const MARRIAGE_LICENSE_CODE = "MARRIAGE_LICENSE";
export const MARRIAGE_MINIMUM_LEAD_DAYS = 14;
const MARRIAGE_RECOMMENDED_LEAD_DAYS = 21;

function formatLeadTime(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "1 day away";
  return `${days} days away`;
}

export function getMarriageLicenseTiming(
  serviceCode: string | undefined,
  intendedDate: string,
  today = toDateKey(),
) {
  if (serviceCode !== MARRIAGE_LICENSE_CODE || !intendedDate) return null;
  const daysUntilMarriage = diffInDays(today, intendedDate);
  if (daysUntilMarriage < 0) return null;

  if (daysUntilMarriage < MARRIAGE_MINIMUM_LEAD_DAYS) {
    return {
      title: "Choose a later marriage date",
      description: `This date is ${formatLeadTime(daysUntilMarriage)}. Allow at least 3 weeks for counseling, document processing, and the required 10-day public-notice period. Choose a later date.`,
      blocksProgress: true,
    };
  }
  if (daysUntilMarriage < MARRIAGE_RECOMMENDED_LEAD_DAYS) {
    return {
      title: "Your marriage date may be too soon",
      description: `This date is ${formatLeadTime(daysUntilMarriage)}. Allow at least 3 weeks for counseling, document processing, and the required 10-day public-notice period.`,
      blocksProgress: false,
    };
  }
  return null;
}
