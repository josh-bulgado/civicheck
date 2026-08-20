export function getStatusDetails(status: string | null) {
  switch (status) {
    case "submitted":
      return { label: "Submitted", styles: "status-neutral" };
    case "under_validation":
      return { label: "Under Validation", styles: "status-info" };
    case "incomplete":
      return { label: "Incomplete", styles: "status-warning" };
    case "rejected":
      return { label: "Rejected", styles: "status-error" };
    case "processing":
      return { label: "Processing", styles: "status-info" };
    case "pending_approval":
      return { label: "Pending Approval", styles: "status-info" };
    case "ready_for_release":
      return { label: "Ready for Release", styles: "status-success" };
    case "released":
      return { label: "Released", styles: "status-success" };
    case "document_approved":
      return { label: "Document Approved", styles: "status-success" };
    case "document_rejected":
      return { label: "Document Rejected", styles: "status-error" };
    case "document_resubmitted":
      return { label: "Document Resubmitted", styles: "status-warning" };
    default:
      return { label: status || "Unknown", styles: "status-neutral" };
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
