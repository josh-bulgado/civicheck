export function canCancelCtcBirthRequest(status: string, serviceCode: string | null, formData: Record<string, unknown>) {
  return status === "submitted" &&
    ["CTC-LOCAL", "CTC-ABROAD", "CTC_ISSUANCE"].includes(serviceCode ?? "") &&
    formData.record_type === "birth";
}
