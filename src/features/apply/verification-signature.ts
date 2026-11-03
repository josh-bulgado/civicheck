export function requiresVerificationSignature(serviceCode: string, recordType: unknown) {
  return ["CTC-LOCAL", "CTC-ABROAD", "CTC_ISSUANCE"].includes(serviceCode) &&
    (recordType === "birth" || recordType === "marriage");
}
