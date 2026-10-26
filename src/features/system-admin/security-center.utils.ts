import { countLabel } from "./system-health.utils";
import type {
  SecurityActivity,
  SecurityCenterDashboard,
  SecurityControlStatus,
  SecurityFindingCategory,
  SecurityFindingSeverity,
  SecurityFindingStatus,
  SecurityPosture,
} from "./system-admin.types";

const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "Asia/Manila",
});

const monthDayFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

const shortTimestampFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

export const postureContent: Record<
  SecurityPosture,
  { label: string; detail: string }
> = {
  protected: {
    label: "Protected",
    detail: "No unresolved security finding currently needs review.",
  },
  watch: {
    label: "Watch",
    detail: "Routine findings or policy reviews are waiting for action.",
  },
  attention: {
    label: "Attention needed",
    detail: "At least one high-priority finding needs administrator review.",
  },
};

export const severityLabels: Record<SecurityFindingSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const findingStatusLabels: Record<SecurityFindingStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

export const findingCategoryLabels: Record<SecurityFindingCategory, string> = {
  authentication: "Authentication",
  privileged_access: "Privileged access",
  policy: "Policy",
};

export const controlStatusLabels: Record<SecurityControlStatus, string> = {
  enforced: "Enforced",
  monitoring: "Monitoring",
  review_due: "Review due",
  action_required: "Action required",
};

export function formatSecurityTimestamp(value: string) {
  const timestamp = new Date(value);
  return `${dateFormatter.format(timestamp)} at ${timeFormatter.format(timestamp)}`;
}

export function formatSecurityDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not recorded";
}

export function formatSecurityClock(value: string) {
  return timeFormatter.format(new Date(value));
}

/** "Oct 27, 1:14 AM": the year is left out for events from the last day. */
export function formatSecurityShortTimestamp(value: string) {
  return shortTimestampFormatter.format(new Date(value));
}

export function formatRelativeSecurityTime(
  value: string | null,
  referenceTime: string,
) {
  if (!value) return "Never";
  const elapsedMs = new Date(referenceTime).getTime() - new Date(value).getTime();
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / 86_400_000));
  if (elapsedDays === 0) return "Today";
  if (elapsedDays === 1) return "1 day ago";
  return `${elapsedDays} days ago`;
}

/** Soft chip for a finding's severity or an event's risk. */
export function severityBadgeVariant(severity: SecurityFindingSeverity) {
  return severity === "critical" || severity === "high"
    ? "destructive"
    : severity === "medium"
      ? "warning"
      : "success";
}

export type PostureTone = "ok" | "warn" | "err" | "neutral";

export type PostureBanner = {
  tone: Exclude<PostureTone, "neutral">;
  label: string;
  detail: string;
  /** The button on the banner. Null when nothing is waiting for the reader. */
  action: { label: string; tab: "findings" | "controls" } | null;
};

export type PostureMetric = {
  key: "findings" | "accounts" | "sign-ins" | "reviews";
  tone: PostureTone;
  title: string;
  detail: string;
};

// The server raises a finding at five rejected sign-ins in an hour (medium) and
// ten (high); the banner flags the 24-hour total at the same two marks.
const REJECTED_SIGN_INS_WARN = 5;
const REJECTED_SIGN_INS_URGENT = 10;

export function postureBanner(
  data: Pick<
    SecurityCenterDashboard,
    "posture" | "openFindingCount" | "urgentFindingCount" | "overdueControlCount"
  >,
): PostureBanner {
  if (data.posture === "protected") {
    return {
      tone: "ok",
      label: "All clear",
      detail: "No findings or reviews are waiting.",
      action: null,
    };
  }

  if (data.posture === "attention") {
    const urgent = data.urgentFindingCount;
    return {
      tone: "err",
      label: "Urgent",
      detail: `${countLabel(urgent, "urgent finding")} ${urgent === 1 ? "needs" : "need"} action today.`,
      action: { label: "Review urgent findings", tab: "findings" },
    };
  }

  const hasFindings = data.openFindingCount > 0;
  const hasReviews = data.overdueControlCount > 0;
  return {
    tone: "warn",
    label: "Watch",
    detail:
      hasFindings && hasReviews
        ? "Findings and policy reviews are waiting."
        : hasFindings
          ? "Findings are waiting for review."
          : "Policy reviews are waiting.",
    // With no open finding the waiting work is in the control register.
    action: hasFindings
      ? { label: "Review findings", tab: "findings" }
      : { label: "Review controls", tab: "controls" },
  };
}

/** The four lines beside the verdict, in the order the banner reads them. */
export function postureMetrics(
  data: Pick<
    SecurityCenterDashboard,
    | "openFindingCount"
    | "urgentFindingCount"
    | "failedSignIns24h"
    | "privilegedAccountCount"
    | "privilegedAccounts"
    | "overdueControlCount"
    | "controls"
  >,
): PostureMetric[] {
  const open = data.openFindingCount;
  const urgent = data.urgentFindingCount;
  const moreOpen = open - urgent;
  const findings: PostureMetric =
    urgent > 0
      ? {
          key: "findings",
          tone: "err",
          title: countLabel(urgent, "urgent finding"),
          detail:
            moreOpen > 0
              ? `${moreOpen} more ${moreOpen === 1 ? "is" : "are"} open`
              : "None others are open",
        }
      : open > 0
        ? {
            key: "findings",
            tone: "warn",
            title: `${countLabel(open, "finding")} open`,
            detail: "None are urgent",
          }
        : {
            key: "findings",
            tone: "ok",
            title: "No open findings",
            detail: "Nothing to review",
          };

  const total = data.privilegedAccountCount;
  const stale = data.privilegedAccounts.filter(
    (account) => account.isStale,
  ).length;
  const accounts: PostureMetric =
    total === 0
      ? {
          key: "accounts",
          tone: "neutral",
          title: "No privileged accounts",
          detail: "None were returned",
        }
      : stale > 0
        ? {
            key: "accounts",
            tone: "warn",
            title: countLabel(stale, "stale account"),
            detail: `Of ${countLabel(total, "privileged account")}`,
          }
        : {
            key: "accounts",
            tone: "ok",
            title: countLabel(total, "privileged account"),
            detail: "None are stale",
          };

  const rejected = data.failedSignIns24h;
  const signIns: PostureMetric = {
    key: "sign-ins",
    tone:
      rejected === 0
        ? "ok"
        : rejected >= REJECTED_SIGN_INS_URGENT
          ? "err"
          : rejected >= REJECTED_SIGN_INS_WARN
            ? "warn"
            : "neutral",
    title:
      rejected === 0
        ? "No rejected sign-ins"
        : countLabel(rejected, "rejected sign-in"),
    detail: "In the last 24 hours",
  };

  const due = data.overdueControlCount;
  const upcoming = data.controls.flatMap((control) =>
    control.nextReviewDueAt ? [new Date(control.nextReviewDueAt).getTime()] : [],
  );
  const reviews: PostureMetric =
    due > 0
      ? {
          key: "reviews",
          tone: "warn",
          title: `${countLabel(due, "review")} due`,
          detail: "Policy and credential",
        }
      : {
          key: "reviews",
          tone: "ok",
          title: "Reviews up to date",
          detail:
            upcoming.length > 0
              ? `Next one on ${monthDayFormatter.format(Math.min(...upcoming))}`
              : "Nothing scheduled",
        };

  return [findings, accounts, signIns, reviews];
}

/**
 * The short line under an activity's name. The server stores each event as a
 * full sentence for the audit trail; the table only needs what is new in it.
 */
export function describeActivity(
  activity: Pick<SecurityActivity, "type" | "summary">,
) {
  const summary = activity.summary.trim().replace(/\.$/, "");
  switch (activity.type) {
    case "privileged_action": {
      const action = summary.replace(/^Privileged action recorded:\s*/i, "");
      return action.charAt(0).toUpperCase() + action.slice(1);
    }
    case "admin_session_started":
    case "staff_session_started":
      return summary.replace(/^An? .+? session started/, "Started");
    case "sign_in_failed":
      return "Password sign-in was rejected";
  }
}
