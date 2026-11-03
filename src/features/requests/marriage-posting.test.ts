import { describe, expect, it } from "vitest";
import { marriagePostingBlockedReason, marriagePostingEnd, marriagePostingMessage, postingToday } from "./marriage-posting";
import { planRequestActions } from "./request-actions";

describe("delayed marriage and reconstruction posting", () => {
  it("counts calendar days across weekends, holidays, months and leap years", () => {
    expect(marriagePostingEnd("2026-12-24")).toBe("2027-01-03");
    expect(marriagePostingEnd("2028-02-20")).toBe("2028-03-01");
    expect(marriagePostingEnd("2026-11-03")).toBe("2026-11-13");
  });
  it("uses the Philippine date even when UTC is still the previous day", () => {
    expect(postingToday(new Date("2026-11-12T16:00:00Z"))).toBe("2026-11-13");
  });
  it("blocks missing, invalid, future and unfinished posting dates", () => {
    for (const date of [null, "", "2026-02-30", "2026-11-14", "2026-11-04"]) {
      expect(marriagePostingBlockedReason(date, "2026-11-13")).toBeTruthy();
    }
    expect(marriagePostingBlockedReason("2026-11-03", "2026-11-12")).toBeTruthy();
    expect(marriagePostingBlockedReason("2026-11-03", "2026-11-13")).toBeUndefined();
    expect(marriagePostingMessage("2026-11-03", "2026-11-12")).toContain("1 calendar day remaining");
    expect(marriagePostingMessage("2026-11-03", "2026-11-13")).toContain("Staff must finish");
  });
  it("keeps processing available, gates readiness and release, and preserves payment checks", () => {
    const input = { serviceCode: "MARRIAGE_DELAYED", status: "processing", paymentStatus: "unpaid",
      feesDue: 500, canProcess: true, attachments: [], today: "2026-11-13" };
    expect(planRequestActions(input).primary?.blocked).toBeTruthy();
    expect(planRequestActions({ ...input, status: "under_validation" }).primary?.blocked).toBeUndefined();
    expect(planRequestActions({ ...input, postingStartDate: "2026-11-03" }).primary?.blocked).toBeUndefined();
    expect(planRequestActions({ ...input, status: "ready_for_release", paymentStatus: "verified" }).primary?.blocked).toBeTruthy();
    expect(planRequestActions({ ...input, status: "ready_for_release", postingStartDate: "2026-11-03" }).primary?.blocked).toContain("cashier");
    expect(planRequestActions({ ...input, serviceCode: "MARRIAGE_ONTIME" }).primary?.blocked).toBeUndefined();
    expect(planRequestActions({ ...input, serviceCode: "MARRIAGE_LICENSE" }).primary?.blocked).toBeUndefined();
  });
});
