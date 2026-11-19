export function canCancelOwnRequest(status: string, formData: Record<string, unknown>) {
  return status === "submitted" &&
    formData.intake_channel !== "walk_in";
}
