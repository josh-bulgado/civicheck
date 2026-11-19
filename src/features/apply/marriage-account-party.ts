export const ACCOUNT_PARTY_ROLE = "account_party_role";

export function requiresMarriageAccountParty(serviceCode: string) {
  return ["MARRIAGE_LICENSE", "MARRIAGE_ONTIME", "MARRIAGE_DELAYED"].includes(serviceCode);
}

export function isMarriageAccountRole(value: unknown): value is "Bride" | "Groom" {
  return value === "Bride" || value === "Groom";
}

export function accountPartyName(profile: {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix?: string;
  hasNoMiddleName: boolean;
}) {
  const noMiddleName = profile.hasNoMiddleName || !profile.middleName.trim();
  return {
    firstName: profile.firstName,
    middleName: noMiddleName ? "" : profile.middleName,
    lastName: profile.lastName,
    suffix: profile.suffix ?? "",
    noMiddleName,
  };
}
