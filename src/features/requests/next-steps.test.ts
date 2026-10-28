import { describe, expect, it } from "vitest";
import { nextSteps } from "./next-steps";

const ready = (over: { feesDue: number; paymentStatus: string | null; allowsMessages?: boolean }) =>
  nextSteps({
    status: "ready_for_release",
    allowsMessages: false,
    attachments: [],
    logs: [],
    ...over,
  });

describe("what to do next once a request is ready for release", () => {
  it("adds bringing the fee, with the amount, when one is owed", () => {
    expect(ready({ feesDue: 150, paymentStatus: "unpaid" })).toEqual({
      kind: "steps",
      steps: [
        "Bring your original documents",
        "Bring ₱150.00 to pay at the counter",
        "Claim your document",
      ],
    });
  });

  it("does not mention payment for a free request", () => {
    expect(ready({ feesDue: 0, paymentStatus: "unpaid" })).toEqual({
      kind: "steps",
      steps: ["Bring your original documents", "Claim your document at the CCRO"],
    });
  });

  it("does not mention payment once the cashier has verified it", () => {
    expect(ready({ feesDue: 150, paymentStatus: "verified" })).toEqual({
      kind: "steps",
      steps: ["Bring your original documents", "Claim your document"],
    });
  });

  it("tells the applicant not to visit while staff are still working", () => {
    for (const status of ["submitted", "under_validation", "processing"]) {
      expect(
        nextSteps({
          status,
          paymentStatus: "unpaid",
          feesDue: 150,
          allowsMessages: false,
          attachments: [],
          logs: [],
        }),
      ).toEqual({
        kind: "line",
        text: "No need to visit yet. We'll notify you when it's ready for release.",
      });
    }
  });

  it("sends an inquiry to the messages, with no visit and no money", () => {
    expect(ready({ feesDue: 150, paymentStatus: "unpaid", allowsMessages: true })).toEqual({
      kind: "steps",
      steps: ["Read CCRO's reply in the messages"],
    });
  });
});
