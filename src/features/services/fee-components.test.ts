import { describe, expect, it } from "vitest";
import { includedFeeTotal } from "~/features/services/fee-components";

describe("fee-components", () => {
  it("includedFeeTotal adds in cents", () => {
    expect(
      includedFeeTotal([
        { label: "a", amount: 0.1, included: true },
        { label: "b", amount: 0.2, included: true },
      ]),
    ).toBe(0.3);
  });
});
