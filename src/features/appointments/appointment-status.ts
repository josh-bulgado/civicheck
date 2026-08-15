export function getAppointmentStatusDetails(status: string | null) {
  switch (status) {
    case "scheduled":
      return { label: "Scheduled", styles: "status-success" };
    case "attended":
      return { label: "Attended", styles: "status-neutral" };
    case "missed":
      return { label: "Missed", styles: "status-error" };
    case "cancelled":
      return { label: "Cancelled", styles: "status-neutral" };
    default:
      return { label: status || "Scheduled", styles: "status-neutral" };
  }
}
