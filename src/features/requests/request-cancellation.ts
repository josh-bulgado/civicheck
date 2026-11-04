export function canCancelCtcRequest(status: string, serviceCode: string | null, formData: Record<string, unknown>) {
  return status === "submitted" &&
    ["CTC-LOCAL", "CTC-ABROAD", "CTC_ISSUANCE"].includes(serviceCode ?? "") &&
    ["birth", "marriage", "death"].includes(String(formData.record_type ?? ""));
}
