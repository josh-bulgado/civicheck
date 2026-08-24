// Falls back to a title-cased version of the raw value (e.g. "payment_verified"
// -> "Payment Verified") instead of the snake_case enum, so a status the switch
// below hasn't been taught yet degrades gracefully instead of leaking an id.
function titleCaseStatus(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type StatusBadgeVariant = "info" | "success" | "warning" | "neutral" | "destructive";

interface StatusDetails {
  label: string;
  styles: string;
  dot: string;
  variant: StatusBadgeVariant;
}

interface PaymentDetails {
  label: string;
  styles: string;
  variant: StatusBadgeVariant;
}

// Timeline dots deliberately use a narrower palette than the status badges:
// gray for ordinary forward progress, red only for the states that need
// attention, green only for the one true finish line. Mirroring the badges'
// full 5-tone palette down a list of log entries reads as noise, not signal.
export function getStatusDetails(status: string | null): StatusDetails {
  switch (status) {
    case "submitted":
      return { label: "Submitted", styles: "status-neutral", dot: "bg-health-neutral-dot", variant: "neutral" };
    case "under_validation":
      return { label: "Under Validation", styles: "status-info", dot: "bg-health-neutral-dot", variant: "info" };
    case "incomplete":
      return { label: "Incomplete", styles: "status-warning", dot: "bg-health-neutral-dot", variant: "warning" };
    case "rejected":
      return { label: "Rejected", styles: "status-error", dot: "bg-health-error-dot", variant: "destructive" };
    case "processing":
      return { label: "Processing", styles: "status-info", dot: "bg-health-neutral-dot", variant: "info" };
    case "pending_approval":
      return { label: "Pending Approval", styles: "status-info", dot: "bg-health-neutral-dot", variant: "info" };
    case "ready_for_release":
      return { label: "Ready for Release", styles: "status-success", dot: "bg-health-neutral-dot", variant: "success" };
    case "released":
      return { label: "Released", styles: "status-success", dot: "bg-health-success-dot", variant: "success" };
    case "document_approved":
      return { label: "Document Approved", styles: "status-success", dot: "bg-health-neutral-dot", variant: "success" };
    case "document_rejected":
      return { label: "Document Rejected", styles: "status-error", dot: "bg-health-error-dot", variant: "destructive" };
    case "document_resubmitted":
      return { label: "Document Resubmitted", styles: "status-warning", dot: "bg-health-neutral-dot", variant: "warning" };
    case "payment_verified":
      return { label: "Payment Verified", styles: "status-success", dot: "bg-health-neutral-dot", variant: "success" };
    case "document_reverted":
      return { label: "Document Reopened", styles: "status-warning", dot: "bg-health-neutral-dot", variant: "warning" };
    default:
      return {
        label: status ? titleCaseStatus(status) : "Unknown",
        styles: "status-neutral",
        dot: "bg-health-neutral-dot",
        variant: "neutral",
      };
  }
}

export function getPaymentDetails(paymentStatus: string | null): PaymentDetails {
  switch (paymentStatus) {
    case "unpaid":
      return { label: "Unpaid", styles: "status-warning", variant: "warning" };
    case "verified":
      return { label: "Paid", styles: "status-success", variant: "success" };
    default:
      return { label: paymentStatus || "Unpaid", styles: "status-neutral", variant: "neutral" };
  }
}
