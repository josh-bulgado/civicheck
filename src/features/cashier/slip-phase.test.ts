import { describe, expect, it } from "vitest";

import { getSlipPhase, isTakingPayment } from "./slip-phase";

const ready = { status: "ready_for_release", paymentStatus: "unpaid", feesDue: 1100 };

describe("getSlipPhase", () => {
  it("takes a receipt number for a fee, and a tick when nothing is due", () => {
    expect(getSlipPhase(ready, null)).toBe("collect");
    expect(getSlipPhase({ ...ready, feesDue: 0 }, null)).toBe("confirm-free");
  });

  it("refuses payment until the request is ready for release", () => {
    expect(getSlipPhase({ ...ready, status: "processing" }, null)).toBe("not-ready");
    expect(getSlipPhase({ ...ready, status: "under_validation", feesDue: 0 }, null)).toBe(
      "not-ready",
    );
  });

  it("recognises a payment verified earlier, even if the request has moved on", () => {
    expect(getSlipPhase({ ...ready, paymentStatus: "verified" }, null)).toBe("settled");
    expect(
      getSlipPhase({ status: "released", paymentStatus: "verified", feesDue: 1100 }, null),
    ).toBe("settled");
  });

  it("says a payment was just verified, over whatever the server now reports", () => {
    expect(
      getSlipPhase({ ...ready, paymentStatus: "verified" }, { free: false, orNumber: "004812" }),
    ).toBe("just-verified");
  });
});

describe("isTakingPayment", () => {
  it("is true only while the slip is asking for the receipt or the tick", () => {
    expect(isTakingPayment("collect")).toBe(true);
    expect(isTakingPayment("confirm-free")).toBe(true);
    expect(isTakingPayment("not-ready")).toBe(false);
    expect(isTakingPayment("settled")).toBe(false);
    expect(isTakingPayment("just-verified")).toBe(false);
  });
});
