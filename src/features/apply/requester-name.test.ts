import { describe, expect, it } from "vitest";
import { requiresAccountRequester } from "./requester-name";

describe("account requester scope", () => {
  it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL"])("excludes %s", (code) => {
    expect(requiresAccountRequester(code)).toBe(false);
  });
  it.each(["CTC_ISSUANCE", "CTC-LOCAL", "CTC-ABROAD", "EMAIL_INQUIRY", "ELEC_ENDORSEMENT"])("includes %s", (code) => {
    expect(requiresAccountRequester(code)).toBe(true);
  });
});
