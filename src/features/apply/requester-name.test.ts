import { describe, expect, it } from "vitest";
import { requesterNameAnswers, requiresAccountRequester } from "./requester-name";

describe("account requester scope", () => {
  it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL"])("excludes %s", (code) => {
    expect(requiresAccountRequester(code)).toBe(false);
  });
  it.each(["CTC_ISSUANCE", "CTC-LOCAL", "CTC-ABROAD", "EMAIL_INQUIRY", "ELEC_ENDORSEMENT"])("includes %s", (code) => {
    expect(requiresAccountRequester(code)).toBe(true);
  });
});

it.each(["", "   "])("marks an autofilled blank middle name as N/A: %j", (middleName) => {
  expect(requesterNameAnswers({ firstName: "Juan", middleName, lastName: "Cruz", hasNoMiddleName: false }).requester_middle_name).toBe("N/A");
});

it("preserves an existing middle name and honors the explicit no-middle-name flag", () => {
  const profile = { firstName: "Juan", middleName: "Santos", lastName: "Cruz", hasNoMiddleName: false };
  expect(requesterNameAnswers(profile).requester_middle_name).toBe("Santos");
  expect(requesterNameAnswers({ ...profile, hasNoMiddleName: true }).requester_middle_name).toBe("N/A");
});
