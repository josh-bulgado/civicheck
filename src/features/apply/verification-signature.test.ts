import { describe, expect, it } from "vitest";
import { requiresVerificationSignature } from "./verification-signature";
import { groupFormData } from "~/features/requests/form-data-groups";

describe("verification signatures", () => {
  it.each(["CTC-LOCAL", "CTC-ABROAD", "CTC_ISSUANCE"])("requires a signature for %s birth", (code) => {
    expect(requiresVerificationSignature(code, "birth")).toBe(true);
  });
  it.each(["CTC-LOCAL", "CTC-ABROAD", "CTC_ISSUANCE"])("requires a signature for %s marriage", (code) => {
    expect(requiresVerificationSignature(code, "marriage")).toBe(true);
  });
  it.each(["CTC-LOCAL", "CTC-ABROAD", "CTC_ISSUANCE"])("requires a signature for %s death", (code) => {
    expect(requiresVerificationSignature(code, "death")).toBe(true);
  });
  it.each([
    ["EMAIL_INQUIRY", "marriage"], ["EMAIL_INQUIRY", "death"],
    ["EMAIL_INQUIRY", "birth"], ["BIRTH_ONTIME", "birth"],
    ["CTC-LOCAL", undefined],
  ])("leaves other cases unchanged: %s %s", (code, record) => {
    expect(requiresVerificationSignature(code, record)).toBe(false);
  });
  it("keeps signature image data out of submitted answer rows", () => {
    const groups = groupFormData({
      requester_signature: "data:image/png;base64,secret",
      requester_signed_at: "2026-11-02T00:00:00Z",
      purpose_of_request: "School",
    }, (key) => key);
    expect(groups.flatMap((group) => group.rows).map((row) => row.key))
      .toEqual(["purpose_of_request"]);
  });
});
