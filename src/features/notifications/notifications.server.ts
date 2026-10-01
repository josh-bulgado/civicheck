import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "~/utils/resend";
import { getStatusDetails } from "~/features/services/request-status";
import type { NotificationType } from "~/features/notifications/notifications.queries";
import type { RequestStatus } from "~/features/requests/request-workflow";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/**
 * Every notification carries two renderings from one call site: `text` is
 * what's stored on the row and shown in the in-system feed (plain text, so
 * the feed never needs `dangerouslySetInnerHTML`), `html` is only ever
 * handed to Resend and never persisted.
 */
type NotificationContent = {
  type: NotificationType;
  subject: string;
  text: string;
  html: string;
};

/**
 * `action` is the "what to do next" sentence, written to read naturally in
 * both places: in the in-system feed the applicant is already signed in, so it
 * stands alone ("Open "My Requests"…"); in the email they aren't, so it gets a
 * "Sign in to CiviCheck and…" lead-in.
 */
function composeContent(
  type: NotificationType,
  subject: string,
  lines: string[],
  action: string,
): NotificationContent {
  const text = [...lines, `${action[0].toUpperCase()}${action.slice(1)}`].join("\n\n");
  const htmlLines = [...lines, `Sign in to CiviCheck and ${action}`];
  const html = htmlLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  return { type, subject, text, html };
}

export function buildStatusChangeEmail(
  status: RequestStatus,
  trackingNumber: string,
  remarks?: string | null,
): NotificationContent {
  const label = getStatusDetails(status).label;
  const subject = `Request ${trackingNumber}: now ${label}`;
  const lines = [`Your CiviCheck request ${trackingNumber} is now "${label}".`, remarks || ""].filter(
    Boolean,
  );
  return composeContent("status_change", subject, lines, `open "My Requests" for the full details.`);
}

export function buildPreValidationCompleteEmail(trackingNumber: string): NotificationContent {
  const subject = `Request ${trackingNumber}: pre-validation complete`;
  const lines = [
    `All the documents you pre-uploaded for request ${trackingNumber} have been reviewed and approved.`,
    `You may now visit the CCRO in person to finish your request. Please bring the physical original copies of the documents you uploaded, along with payment for the applicable fee.`,
  ];
  return composeContent(
    "pre_validation_complete",
    subject,
    lines,
    `open "My Requests" for the full details.`,
  );
}

export function buildDocumentRejectedEmail(
  trackingNumber: string,
  requirementName: string,
  reason: string,
): NotificationContent {
  const subject = `Request ${trackingNumber}: a document needs a fix`;
  const lines = [
    `Your document "${requirementName}" for request ${trackingNumber} was rejected.`,
    `Reason: ${reason}`,
  ];
  return composeContent(
    "document_rejected",
    subject,
    lines,
    `open "My Requests" to upload a corrected copy.`,
  );
}

/**
 * Writes the in-system notification row and best-effort sends the matching
 * email. Never throws — a delivery failure shouldn't roll back the status
 * change that triggered it; the outcome is recorded on the row instead.
 */
export async function dispatchApplicantNotification(
  supabase: SupabaseClient,
  requestId: string,
  content: NotificationContent,
) {
  const { type, subject, text, html } = content;
  const { data: email } = await supabase.rpc("get_applicant_email", {
    p_request_id: requestId,
  });
  if (!email) return;

  const { data: notification, error: insertError } = await supabase
    .from("notifications")
    .insert({ request_id: requestId, recipient_email: email, type, subject, body: text })
    .select("id")
    .single();
  if (insertError || !notification) {
    console.error("Failed to record notification", insertError);
    return;
  }

  try {
    await sendEmail({ to: email, subject, html });
    await supabase.from("notifications").update({ status: "sent" }).eq("id", notification.id);
  } catch (err) {
    console.error("Failed to send notification email", err);
    await supabase.from("notifications").update({ status: "failed" }).eq("id", notification.id);
  }
}
