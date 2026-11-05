import { describe, expect, it } from "vitest";
import {
  isRequestClaimActive,
  requestClaimBlockedReason,
  type RequestClaim,
} from "./request-claims";

const NOW = Date.parse("2026-11-05T12:00:00.000Z");

function claim(overrides: Partial<RequestClaim> = {}): RequestClaim {
  return {
    staffId: "staff-a",
    staffName: "Ana Reyes",
    stage: "under_validation",
    claimedAt: "2026-11-05T11:55:00.000Z",
    expiresAt: "2026-11-05T12:10:00.000Z",
    isMine: true,
    ...overrides,
  };
}

describe("request stage claims", () => {
  it("lets the current holder work only on the claimed status", () => {
    expect(isRequestClaimActive(claim(), "under_validation", NOW)).toBe(true);
    expect(requestClaimBlockedReason(claim(), "under_validation", NOW)).toBeNull();
    expect(isRequestClaimActive(claim(), "processing", NOW)).toBe(false);
  });

  it("names another active handler", () => {
    expect(
      requestClaimBlockedReason(claim({ isMine: false }), "under_validation", NOW),
    ).toBe("Ana Reyes is handling this stage");
  });

  it("makes expired work available again", () => {
    const expired = claim({ expiresAt: "2026-11-05T11:59:59.000Z" });
    expect(isRequestClaimActive(expired, "under_validation", NOW)).toBe(false);
    expect(requestClaimBlockedReason(expired, "under_validation", NOW)).toBe(
      "Start handling this stage first",
    );
  });
});
