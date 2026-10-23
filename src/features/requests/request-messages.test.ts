import { describe, expect, it } from "vitest";
import { quickReplies } from "./request-messages";

describe("quickReplies", () => {
  it("asks for the original while documents are being checked", () => {
    for (const status of ["submitted", "under_validation", "incomplete"]) {
      expect(quickReplies(status, 240)).toEqual([
        "Please bring the original of the document we flagged.",
      ]);
    }
  });

  it("sends the applicant to the cashier only when there is a fee", () => {
    expect(quickReplies("processing", 240)[0]).toContain("pay at the cashier");
    expect(quickReplies("processing", 0)[0]).not.toContain("cashier");
  });

  it("says the document is ready once it is", () => {
    expect(quickReplies("ready_for_release", 240)).toEqual([
      "Your document is ready for pickup.",
    ]);
  });

  it("offers nothing once the request is closed", () => {
    expect(quickReplies("released", 240)).toEqual([]);
    expect(quickReplies("rejected", 240)).toEqual([]);
  });
});
