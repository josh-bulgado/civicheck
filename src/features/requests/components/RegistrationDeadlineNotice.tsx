import { CalendarClock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { formatDateKey } from "~/lib/date";
import { usePostingToday } from "../hooks/usePostingToday";
import { isOnTimeRegistration, onTimeRegistrationDeadline } from "../on-time-registration";

export function RegistrationDeadlineNotice({ serviceCode, status, formData }: {
  serviceCode: string;
  status: string;
  formData: Record<string, unknown>;
}) {
  const active = isOnTimeRegistration(serviceCode) &&
    ["submitted", "under_validation", "incomplete", "processing"].includes(status);
  const today = usePostingToday(active);
  if (!active) return null;
  const timing = onTimeRegistrationDeadline(serviceCode, formData, today);
  const remaining = timing?.daysRemaining;
  const countdown = remaining === undefined ? "Check the event date and marriage license basis, if applicable, to determine the deadline."
    : remaining < 0 ? `Deadline passed ${Math.abs(remaining)} day${remaining === -1 ? "" : "s"} ago. Check the registration status before proceeding.`
    : remaining === 0 ? "Due today."
    : `${remaining} day${remaining === 1 ? "" : "s"} remaining.`;

  return (
    <Alert variant={remaining === undefined || remaining <= 3 ? "warning" : "info"} role="status">
      <CalendarClock aria-hidden="true" />
      <AlertTitle>On-time registration deadline{timing ? `: ${formatDateKey(timing.deadline)}` : " unavailable"}</AlertTitle>
      <AlertDescription>{countdown}</AlertDescription>
    </Alert>
  );
}
