export function requiresAccountRequester(serviceCode: string) {
  return ["CTC_ISSUANCE", "CTC-LOCAL", "CTC-ABROAD", "EMAIL_INQUIRY", "ELEC_ENDORSEMENT"].includes(serviceCode);
}

export const REQUESTER_NAME_KEYS = [
  "requester_first_name", "requester_middle_name", "requester_last_name", "requester_suffix",
] as const;

export function requesterNameAnswers(profile: {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix?: string;
  hasNoMiddleName: boolean;
}) {
  return {
    requester_first_name: profile.firstName,
    requester_middle_name: profile.hasNoMiddleName ? "N/A" : profile.middleName,
    requester_last_name: profile.lastName,
    requester_suffix: profile.suffix ?? "",
  };
}
