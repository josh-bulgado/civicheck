import { diffInDays, formatDateKey, fromDateKey, toDateKey } from "~/lib/date";
import { todayKeyInTimeZone } from "~/features/forms/form-template.utils";

const ON_TIME_REGISTRATION_CODES = [
  "BIRTH_ONTIME",
  "OTCOLB-MARITAL",
  "OTCOLB-NONMARITAL",
  "MARRIAGE_ONTIME",
  "DEATH_ONTIME",
];

export function isOnTimeRegistration(serviceCode: string | null | undefined): boolean {
  return !!serviceCode && ON_TIME_REGISTRATION_CODES.includes(serviceCode.toUpperCase());
}

type RegistrationAnswers = Record<string, unknown>;

// PSA registration periods: https://rsso11.psa.gov.ph/vital-statistics
export function onTimeRegistrationNotice(
  serviceCode: string | null | undefined,
  answers: RegistrationAnswers = {},
  today = todayKeyInTimeZone("Asia/Manila"),
): string | null {
  if (!isOnTimeRegistration(serviceCode)) return null;
  const code = serviceCode!.toUpperCase();
  const marriage = code === "MARRIAGE_ONTIME";
  const event = marriage ? "marriage" : code === "DEATH_ONTIME" ? "death" : "birth";
  const basis = answers.marriage_license_basis;
  const days = marriage
    ? basis === "with_license" ? 15
      : basis === "article_34" || basis === "pd_1083" ? 30 : null
    : 30;
  const period = days === null
    ? "15 days from the date of marriage with a license, or 30 days for a license-exempt marriage"
    : `${days} days from the date of ${event}`;
  let heading = "Visit CCRO for final validation";
  const eventDate = typeof answers.event_date === "string" ? fromDateKey(answers.event_date) : null;
  if (days !== null && eventDate && fromDateKey(today) && diffInDays(answers.event_date as string, today) >= 0) {
    eventDate.setDate(eventDate.getDate() + days);
    const deadline = toDateKey(eventDate);
    const remaining = diffInDays(today, deadline);
    const countdown = remaining < 0
      ? "deadline has passed"
      : remaining === 0 ? "due today"
      : `${remaining} ${remaining === 1 ? "day" : "days"} left`;
    heading = remaining < 0
      ? `Deadline: ${formatDateKey(deadline)} - ${countdown}`
      : `Visit CCRO by ${formatDateKey(deadline)} - ${countdown}`;
  }
  const rule = `${event[0].toUpperCase()}${event.slice(1)} registration is due within ${period}. Late submission requires delayed registration.`;
  const lines = [heading, "Bring your hard copies for final validation.", rule];
  if (heading.includes("deadline has passed")) lines.push("Your request will automatically switch to delayed registration. Check My Requests for the updated requirements.");
  if (event === "death") lines.push("Report the death to the Local Health Officer within 48 hours.");
  const notice = lines.join("\n");
  return notice;
}
