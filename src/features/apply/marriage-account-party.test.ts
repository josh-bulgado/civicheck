import { describe, expect, it } from "vitest";
import { accountPartyName, requiresMarriageAccountParty } from "./marriage-account-party";

describe("marriage account identity scope", () => {
  it.each(["MARRIAGE_LICENSE", "MARRIAGE_ONTIME", "MARRIAGE_DELAYED"])("includes %s", (code) => {
    expect(requiresMarriageAccountParty(code)).toBe(true);
  });
  it.each(["CTC-LOCAL", "CTC-ABROAD", "EMAIL_INQUIRY", "ELEC_ENDORSEMENT", "OTCOLB-MARITAL", "DEATH_ONTIME"])("excludes %s", (code) => {
    expect(requiresMarriageAccountParty(code)).toBe(false);
  });
  it("uses the explicit no-middle-name choice without copying stale middle names", () => {
    expect(accountPartyName({ firstName: "Ana", middleName: "Old", lastName: "Reyes", hasNoMiddleName: true }))
      .toEqual({ firstName: "Ana", middleName: "", lastName: "Reyes", suffix: "", noMiddleName: true });
  });
  it("automatically marks a blank middle name even when the profile flag is off", () => {
    expect(accountPartyName({ firstName: "Ana", middleName: " ", lastName: "Reyes", hasNoMiddleName: false }))
      .toMatchObject({ middleName: "", noMiddleName: true });
  });
});
