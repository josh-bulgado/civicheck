import type {
  DashboardPaymentStatus,
  DashboardRequestStatus,
} from "./dashboard.types";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Manila",
});

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const STATUS_LABELS: Record<string, string> = {
  pending_frontdesk: "Pending review",
  under_validation: "Under validation",
  incomplete: "Incomplete",
  rejected: "Rejected",
  processing: "Processing",
  pending_approval: "Pending approval",
  ready_for_release: "Ready for release",
  released: "Released",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  verified: "Paid",
};

function humanize(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function getStatusLabel(status: DashboardRequestStatus) {
  if (!status) return "Awaiting intake";
  return STATUS_LABELS[status] ?? humanize(status);
}

export function getPaymentLabel(status: DashboardPaymentStatus) {
  if (!status) return "Not recorded";
  return PAYMENT_LABELS[status] ?? humanize(status);
}

export function getStatusTone(status: DashboardRequestStatus) {
  if (status === "released" || status === "ready_for_release")
    return "status-success";
  if (status === "rejected" || status === "incomplete") return "status-error";
  if (status === "pending_frontdesk" || status === "pending_approval")
    return "status-warning";
  if (status === "processing" || status === "under_validation")
    return "border-primary/20 bg-primary-soft text-primary";
  return "status-neutral";
}

export function getPaymentTone(status: DashboardPaymentStatus) {
  if (status === "verified") return "status-success";
  if (status === "unpaid") return "status-error";
  return "status-neutral";
}

export function formatCurrency(value: number) {
  return CURRENCY_FORMATTER.format(value);
}

export function formatDate(value: string) {
  return DATE_FORMATTER.format(new Date(value));
}

export function formatLongDate(value: string) {
  return LONG_DATE_FORMATTER.format(new Date(value));
}

export function getAgeInDays(value: string, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(value).getTime());
  return Math.floor(elapsed / 86_400_000);
}

export function formatAge(value: string, now = Date.now()) {
  const days = getAgeInDays(value, now);
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
