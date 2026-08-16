import type {
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
