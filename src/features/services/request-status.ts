// Falls back to a title-cased version of the raw value (e.g. "payment_verified"
// -> "Payment Verified") instead of the snake_case enum, so a status the switch
// below hasn't been taught yet degrades gracefully instead of leaking an id.
function titleCaseStatus(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Timeline dots deliberately use a narrower palette than the status badges:
// gray for ordinary forward progress, red only for the states that need
// attention, green only for the one true finish line. Mirroring the badges'
// full 5-tone palette down a list of log entries reads as noise, not signal.
export function getStatusDetails(status: string | null) {
  switch (status) {
    case "submitted":
      return { label: "Submitted", styles: "status-neutral", dot: "bg-health-neutral-dot" };
    case "under_validation":
      return { label: "Under Validation", styles: "status-info", dot: "bg-health-neutral-dot" };
    case "incomplete":
      return { label: "Incomplete", styles: "status-warning", dot: "bg-health-neutral-dot" };
    case "rejected":
      return { label: "Rejected", styles: "status-error", dot: "bg-health-error-dot" };
    case "processing":
      return { label: "Processing", styles: "status-info", dot: "bg-health-neutral-dot" };
    case "pending_approval":
      return { label: "Pending Approval", styles: "status-info", dot: "bg-health-neutral-dot" };
    case "ready_for_release":
      return { label: "Ready for Release", styles: "status-success", dot: "bg-health-neutral-dot" };
    case "released":
      return { label: "Released", styles: "status-success", dot: "bg-health-success-dot" };
    case "document_approved":
      return { label: "Document Approved", styles: "status-success", dot: "bg-health-neutral-dot" };
    case "document_rejected":
      return { label: "Document Rejected", styles: "status-error", dot: "bg-health-error-dot" };
    case "document_resubmitted":
      return { label: "Document Resubmitted", styles: "status-warning", dot: "bg-health-neutral-dot" };
    case "payment_verified":
      return { label: "Payment Verified", styles: "status-success", dot: "bg-health-neutral-dot" };
    case "document_reverted":
      return { label: "Document Reopened", styles: "status-warning", dot: "bg-health-neutral-dot" };
    default:
      return {
        label: status ? titleCaseStatus(status) : "Unknown",
        styles: "status-neutral",
        dot: "bg-health-neutral-dot",
      };
  }
}

export function getPaymentDetails(paymentStatus: string | null) {
  switch (paymentStatus) {
    case "unpaid":
      return { label: "Unpaid", styles: "status-warning" };
    case "verified":
      return { label: "Paid", styles: "status-success" };
    default:
      return { label: paymentStatus || "Unpaid", styles: "status-neutral" };
  }
}
