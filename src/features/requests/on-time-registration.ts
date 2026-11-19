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

export function onTimeRegistrationDeadline(
  serviceCode: string | null | undefined,
  answers: RegistrationAnswers,
  today = todayKeyInTimeZone("Asia/Manila"),
) {
  if (!isOnTimeRegistration(serviceCode)) return null;
  const days = registrationPeriod(serviceCode!.toUpperCase(), answers);
  const eventDate = typeof answers.event_date === "string" ? fromDateKey(answers.event_date) : null;
  if (days === null || !eventDate || !fromDateKey(today) || diffInDays(answers.event_date as string, today) < 0) return null;
  eventDate.setDate(eventDate.getDate() + days);
  const deadline = toDateKey(eventDate);
  return { deadline, daysRemaining: diffInDays(today, deadline) };
}

function registrationPeriod(code: string, answers: RegistrationAnswers) {
  if (code !== "MARRIAGE_ONTIME") return 30;
  const basis = answers.marriage_license_basis;
  return basis === "with_license" ? 15
    : basis === "article_34" || basis === "pd_1083" ? 30 : null;
}

// PSA registration periods: https://rsso11.psa.gov.ph/vital-statistics
export function onTimeRegistrationNotice(
  serviceCode: string | null | undefined,
  answers: RegistrationAnswers = {},
  today = todayKeyInTimeZone("Asia/Manila"),
  waitForNotice = true,
): string | null {
  if (!isOnTimeRegistration(serviceCode)) return null;
  const code = serviceCode!.toUpperCase();
  const marriage = code === "MARRIAGE_ONTIME";
  const event = marriage ? "marriage" : code === "DEATH_ONTIME" ? "death" : "birth";
  const days = registrationPeriod(code, answers);
  const period = days === null
    ? "15 days from the date of marriage with a license, or 30 days for a license-exempt marriage"
    : `${days} days from the date of ${event}`;
  let heading = "On-time registration period";
  const timing = onTimeRegistrationDeadline(serviceCode, answers, today);
  if (timing) {
    const remaining = timing.daysRemaining;
    const countdown = remaining < 0
      ? "The deadline has passed."
      : remaining === 0 ? "Due today."
      : `(${remaining} ${remaining === 1 ? "day" : "days"} left)`;
    heading = `On-time registration deadline: ${formatDateKey(timing.deadline)} ${countdown}`;
  }
  const rule = `${event[0].toUpperCase()}${event.slice(1)} registration is due within ${period}. Late submission requires delayed registration.`;
  const lines = [heading,
    ...(waitForNotice ? ["Wait for CCRO’s notice before visiting the office."] : []),
    rule];
  if (heading.includes("deadline has passed")) lines.push("Your request will automatically switch to delayed registration. Check My Requests for the updated requirements.");
  if (event === "death") lines.push("Report the death to the Local Health Officer within 48 hours.");
  const notice = lines.join("\n");
  return notice;
}
