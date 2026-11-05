import type { ReactNode } from "react";
import { QuietLink } from "~/components/quiet-link";
import {
  Banknote,
  CircleCheckBig,
  CircleX,
  FilePlus2,
  FileUp,
  FileWarning,
  MessageSquare,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type {
  NotificationRow,
  NotificationTarget,
  NotificationType,
} from "~/features/notifications/notifications.queries";

// CCRO Legazpi is a single-office deployment, so day boundaries are pinned to
// Philippine time. This also keeps the server-rendered and client-rendered
// group headings identical regardless of where either one happens to run.
export const TIME_ZONE = "Asia/Manila";

export const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const monthDayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
});
const monthDayYearFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const DAY_MS = 24 * 60 * 60 * 1000;

export const TYPE_STYLE: Record<
  NotificationType,
  { icon: LucideIcon; unreadClass: string }
> = {
  status_change: { icon: RefreshCw, unreadClass: "bg-primary-fill text-white" },
  pre_validation_complete: { icon: CircleCheckBig, unreadClass: "bg-primary-fill text-white" },
  document_rejected: { icon: FileWarning, unreadClass: "bg-destructive text-white dark:text-background" },
  new_request: { icon: FilePlus2, unreadClass: "bg-primary-fill text-white" },
  document_resubmitted: { icon: FileUp, unreadClass: "bg-primary-fill text-white" },
  awaiting_cashier: { icon: Banknote, unreadClass: "bg-primary-fill text-white" },
  ready_to_release: { icon: CircleCheckBig, unreadClass: "bg-primary-fill text-white" },
  request_incomplete: { icon: FileWarning, unreadClass: "bg-destructive text-white dark:text-background" },
  request_rejected: { icon: CircleX, unreadClass: "bg-destructive text-white dark:text-background" },
  message: { icon: MessageSquare, unreadClass: "bg-primary-fill text-white" },
  new_message: { icon: MessageSquare, unreadClass: "bg-primary-fill text-white" },
};

/** One typed `QuietLink` per destination, so each keeps its own params/search checking. */
export function linkFor(
  target: NotificationTarget,
  onClick: () => void,
  props: { className?: string; children?: ReactNode } = {},
) {
  switch (target.to) {
    case "/requests/$requestId":
      return (
        <QuietLink
          to="/requests/$requestId"
          params={{ requestId: target.requestId }}
          onClick={onClick}
          {...props}
        />
      );
    case "/cashier":
      return <QuietLink to="/cashier" search={{ tracking: target.tracking }} onClick={onClick} {...props} />;
    default:
      return (
        <QuietLink
          to="/my-requests/$requestId"
          params={{ requestId: target.requestId }}
          onClick={onClick}
          {...props}
        />
      );
  }
}

/**
 * What the row says happened. The feed subject leads with "Request {tracking}:"
 * because it doubles as the email subject; the row already names the service,
 * so that lead-in goes, and a status change drops its "now".
 */
export function feedTitle(subject: string): string {
  const title = subject
    .replace(/^Request\s+\S+:\s*/i, "")
    .replace(/^now\s+/i, "")
    .trim();
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : subject;
}

/**
 * Instructions shown below the notification title. Bodies are written as the
 * restatement of the subject, any remarks or reason, then a generic "open My
 * Requests" action — and the first and last of those add nothing the row
 * doesn't already say. What's left, if anything, is what the applicant needs.
 */
export function feedDetail(notification: NotificationRow): string | null {
  if (notification.type === "pre_validation_complete") {
    return "Once your request is in Processing, go to the CCRO office and bring your original documents and submit hard copies of your requirements for final validation. Bring your tracking number or a printout of your acknowledgment.";
  }
  if (notification.type === "status_change" && /^processing$/i.test(feedTitle(notification.subject))) {
    return "Go to the CCRO office and bring your original documents and submit hard copies of your requirements for final validation. Bring your tracking number or a printout of your acknowledgment.";
  }
  const paragraphs = notification.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) paragraphs.pop();
  if (
    paragraphs.length > 0 &&
    notification.trackingNumber &&
    paragraphs[0].includes(notification.trackingNumber)
  ) {
    paragraphs.shift();
  }
  if (notification.type === "status_change" && /^under validation$/i.test(feedTitle(notification.subject))) {
    const instruction = "CCRO is currently reviewing your uploaded documents. We’ll notify you of updates or needed corrections.";
    if (!paragraphs.includes(instruction)) paragraphs.unshift(instruction);
  }
  if (notification.type === "status_change" && /^ready for release$/i.test(feedTitle(notification.subject))) {
    const instruction = notification.serviceCode === "EMAIL_INQUIRY"
      ? "Read CCRO's reply in the messages."
      : "Pay any outstanding fee at the cashier to claim your document. Open your request for the exact amount.";
    if (!paragraphs.includes(instruction)) paragraphs.unshift(instruction);
  }
  if (notification.type === "status_change" && /^released$/i.test(feedTitle(notification.subject))) {
    const instruction = notification.serviceCode === "EMAIL_INQUIRY"
      ? "Keep CCRO's reply for your records."
      : "Please claim your requested document from the CCRO staff.";
    if (!paragraphs.includes(instruction)) paragraphs.unshift(instruction);
  }
  return paragraphs.length > 0 ? paragraphs.join(" ") : null;
}

/** Time today, "Yesterday", then "Aug 15", with the year once it isn't this one. */
export function feedWhen(sentAt: string, now: number): string {
  const sent = new Date(sentAt);
  const key = dayKeyFormat.format(sent);
  const today = dayKeyFormat.format(now);
  if (key === today) return timeFormat.format(sent);
  if (key === dayKeyFormat.format(now - DAY_MS)) return "Yesterday";
  return key.slice(0, 4) === today.slice(0, 4)
    ? monthDayFormat.format(sent)
    : monthDayYearFormat.format(sent);
}
