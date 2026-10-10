import { hasPermission, type Role } from "~/lib/permissions";

/**
 * Which notification feed a role reads. Applicants read the request-scoped
 * `notifications` table (with its email outbox); CCRO personnel read their own
 * `staff_notifications` rows. `system_admin` has neither, so it gets `null`.
 */
export type NotificationAudience = "applicant" | "staff";

export function getNotificationAudience(role: Role): NotificationAudience | null {
  if (hasPermission(role, "requests:view_own")) return "applicant";
  if (hasPermission(role, "notifications:view_staff")) return "staff";
  return null;
}
