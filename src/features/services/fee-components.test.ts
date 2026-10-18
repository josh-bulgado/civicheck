import { describe, expect, it } from "vitest";
import {
  describeAlsoPayable,
  feeTotalStatus,
  feeUnitLabel,
  includedFeeTotal,
  parseFeeComponents,
} from "~/features/services/fee-components";
import { toFeeComponentPayload } from "~/features/admin/services/components/service-form.config";

describe("fee-components", () => {
  it("includedFeeTotal adds in cents", () => {
    expect(
      includedFeeTotal([
        { label: "a", amount: 0.1, included: true },
        { label: "b", amount: 0.2, included: true },
      ]),
    ).toBe(0.3);
  });

  describe("feeTotalStatus", () => {
    it("matches in cents", () => {
      expect(
        feeTotalStatus(
          [
            { label: "a", amount: 0.1, included: true },
            { label: "b", amount: 0.2, included: true },
          ],
          0.3,
        ),
      ).toEqual({ state: "match", includedTotal: 0.3, difference: 0 });
    });

    it("is short when the fee is higher than the included total", () => {
      const status = feeTotalStatus(
        [{ label: "a", amount: 100, included: true }],
        150,
      );
      expect(status.state).toBe("short");
      expect(status.difference).toBe(50);
    });

    it("is over when the fee is lower than the included total", () => {
      const status = feeTotalStatus(
        [{ label: "a", amount: 150, included: true }],
        100,
      );
      expect(status.state).toBe("over");
      expect(status.difference).toBe(-50);
    });

    it("is none when no row is included", () => {
      expect(
        feeTotalStatus([{ label: "a", amount: 5, included: false }], 100).state,
      ).toBe("none");
      expect(feeTotalStatus([], 100).state).toBe("none");
    });
  });

  describe("parseFeeComponents", () => {
    it("keeps unit and note", () => {
      expect(
        parseFeeComponents([
          { label: "x", amount: 5, included: false, unit: "page", note: "n" },
        ]),
      ).toEqual([
        { label: "x", amount: 5, included: false, unit: "page", note: "n" },
      ]);
    });

    it("keeps the entry but drops an unknown unit", () => {
      const [entry] = parseFeeComponents([
        { label: "x", amount: 5, included: false, unit: "bogus" },
      ]);
      expect(entry).toBeDefined();
      expect(entry.label).toBe("x");
      expect(entry.unit).toBeUndefined();
    });

    it("parses old data without unit or note unchanged", () => {
      const old = { label: "x", amount: 5, included: true };
      expect(parseFeeComponents([old])).toEqual([old]);
    });
  });

  describe("feeUnitLabel", () => {
    it("names each unit", () => {
      expect(feeUnitLabel(undefined)).toBe("Flat");
      expect(feeUnitLabel("page")).toBe("per page");
      expect(feeUnitLabel("copy")).toBe("per copy");
      expect(feeUnitLabel("document")).toBe("per document");
    });
  });

  describe("describeAlsoPayable", () => {
    it("joins amount, unit and note", () => {
      expect(
        describeAlsoPayable({
          label: "Certified copy",
          amount: 5,
          included: false,
          unit: "page",
          note: "by the LCR",
        }),
      ).toBe("₱5.00 per page — by the LCR");
    });

    it("omits the unit when flat and the dash when there is no note", () => {
      expect(
        describeAlsoPayable({ label: "x", amount: 5, included: false }),
      ).toBe("₱5.00");
      expect(
        describeAlsoPayable({
          label: "x",
          amount: 5,
          included: false,
          note: "at the LCR",
        }),
      ).toBe("₱5.00 — at the LCR");
    });
  });

  describe("toFeeComponentPayload", () => {
    it("never emits unit or note for an included row", () => {
      const [row] = toFeeComponentPayload([
        { label: "a", amount: "10", included: true, unit: "page", note: "n" },
      ]);
      expect(row).toEqual({ label: "a", amount: 10, included: true });
      expect("unit" in row).toBe(false);
      expect("note" in row).toBe(false);
    });

    it("emits non-empty unit and note for an also-payable row", () => {
      expect(
        toFeeComponentPayload([
          { label: "a", amount: "5", included: false, unit: "copy", note: " n " },
          { label: "b", amount: "5", included: false, unit: "", note: "" },
        ]),
      ).toEqual([
        { label: "a", amount: 5, included: false, unit: "copy", note: "n" },
        { label: "b", amount: 5, included: false },
      ]);
    });
  });
});
