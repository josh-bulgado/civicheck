import { describe, expect, it } from "vitest";
import type { Service } from "./services.types";
import {
  checklistSharedCount,
  evaluateDraft,
  filterVariants,
  isFeeItemized,
  parseFeeInput,
  summarizeVariants,
} from "./service-group-workbench.utils";

function variant(overrides: Partial<Service> = {}): Service {
  return {
    service_code: "DCOLB-0079-BRAP",
    name: "Delayed Registration of COLB (0-79 yrs, BRAP)",
    fee: 0,
    processing_time: "3 hours + 10 calendar days",
    requirement_group: "DCOLB",
    ...overrides,
  } as Service;
}

describe("parseFeeInput", () => {
  it("reads blank, free and zero as free", () => {
    expect(parseFeeInput("")).toBe(0);
    expect(parseFeeInput(" Free ")).toBe(0);
    expect(parseFeeInput("0.00")).toBe(0);
  });

  it("reads pesos with or without the sign and separators", () => {
    expect(parseFeeInput("500")).toBe(500);
    expect(parseFeeInput("₱1,100.50")).toBe(1100.5);
  });

  it("rejects text, negatives, extra decimals and absurd amounts", () => {
    expect(parseFeeInput("five hundred")).toBeNull();
    expect(parseFeeInput("-5")).toBeNull();
    expect(parseFeeInput("5.555")).toBeNull();
    expect(parseFeeInput("2000000")).toBeNull();
  });
});

describe("evaluateDraft", () => {
  it("is clean with no draft or an unchanged one", () => {
    expect(evaluateDraft(variant(), undefined).dirty).toBe(false);
    expect(
      evaluateDraft(variant({ fee: 500 }), { fee: "500.00", name: " " + variant().name }),
    ).toMatchObject({ dirty: false, updates: {} });
  });

  it("sends only the fields that changed", () => {
    const result = evaluateDraft(variant({ fee: 500 }), {
      fee: "800",
      processing_time: "3 hours + 10 calendar days",
    });
    expect(result.updates).toEqual({ fee: 800 });
    expect(result.dirty).toBe(true);
  });

  it("flags an invalid fee and an empty name without producing updates", () => {
    const result = evaluateDraft(variant(), { fee: "abc", name: "  " });
    expect(result.dirty).toBe(true);
    expect(result.updates).toEqual({});
    expect(result.errors.fee).toBeTruthy();
    expect(result.errors.name).toBeTruthy();
  });

  it("never changes the fee of an itemized variant", () => {
    const itemized = variant({
      fee: 500,
      fee_components: [{ label: "Filing", amount: 500, included: true }],
    });
    expect(isFeeItemized(itemized)).toBe(true);
    expect(evaluateDraft(itemized, { fee: "100" })).toMatchObject({
      dirty: false,
      updates: {},
    });
  });

  it("treats components payable on top as not itemizing the fee", () => {
    const extra = variant({
      fee_components: [{ label: "Copies", amount: 50, included: false }],
    });
    expect(isFeeItemized(extra)).toBe(false);
  });
});

describe("filterVariants", () => {
  const rows = [
    variant({ service_code: "A-FREE", name: "Alpha", fee: 0 }),
    variant({ service_code: "B-PAID", name: "Bravo", fee: 500 }),
  ];

  it("filters by fee and by search over code and name", () => {
    expect(filterVariants(rows, { query: "", fee: "free" })).toHaveLength(1);
    expect(filterVariants(rows, { query: "", fee: "paid" })[0].name).toBe("Bravo");
    expect(filterVariants(rows, { query: "b-paid", fee: "all" })).toHaveLength(1);
    expect(filterVariants(rows, { query: "zzz", fee: "all" })).toHaveLength(0);
  });
});

describe("summarizeVariants", () => {
  it("collapses repeated fees, times and checklists", () => {
    const summary = summarizeVariants([
      variant({ fee: 500 }),
      variant({ service_code: "X", fee: 0 }),
      variant({ service_code: "Y", fee: 500 }),
    ]);
    expect(summary.fees).toEqual([0, 500]);
    expect(summary.processingTimes).toHaveLength(1);
    expect(summary.checklistCount).toBe(1);
    expect(summary.freeCount).toBe(1);
  });
});

describe("checklistSharedCount", () => {
  it("counts variants on the same requirement group, or itself alone", () => {
    const rows = [
      variant({ service_code: "A", requirement_group: "G" }),
      variant({ service_code: "B", requirement_group: "G" }),
      variant({ service_code: "C", requirement_group: null }),
    ];
    expect(checklistSharedCount(rows[0], rows)).toBe(2);
    expect(checklistSharedCount(rows[2], rows)).toBe(1);
  });
});
