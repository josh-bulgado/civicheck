export function getStatusDetails(status: string | null) {
  switch (status) {
    case "pending_frontdesk":
      return { label: "Pending Review", styles: "status-warning" };
    case "under_validation":
      return { label: "Under Validation", styles: "border-primary/20 bg-primary-soft text-primary" };
    case "incomplete":
      return { label: "Incomplete", styles: "status-warning" };
    case "rejected":
      return { label: "Rejected", styles: "status-error" };
    case "processing":
      return { label: "Processing", styles: "border-primary/20 bg-primary-soft text-primary" };
    case "pending_approval":
      return { label: "Pending Approval", styles: "status-warning" };
    case "ready_for_release":
      return { label: "Ready for Release", styles: "status-success" };
    case "released":
      return { label: "Released", styles: "status-success" };
    default:
      return { label: status || "Unknown", styles: "status-neutral" };
  }
}

export function getPaymentDetails(paymentStatus: string | null) {
  switch (paymentStatus) {
    case "unpaid":
      return { label: "Unpaid", styles: "status-error" };
    case "verified":
      return { label: "Paid", styles: "status-success" };
    default:
      return { label: paymentStatus || "Unpaid", styles: "status-neutral" };
  }
}
