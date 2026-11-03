import { describe, expect, it } from "vitest";

import {
  applyFilterChange,
  parseNeedsFilter,
  parsePaymentFilter,
  parseRequestStatus,
  parseWorkflowStage,
} from "./request-queue";

describe("search param parsers", () => {
  it("accepts only the known payment filters", () => {
    expect(parsePaymentFilter("unpaid")).toBe("unpaid");
    expect(parsePaymentFilter("verified")).toBe("verified");
    expect(parsePaymentFilter("paid")).toBeUndefined();
    expect(parsePaymentFilter(undefined)).toBeUndefined();
  });

  it("reads Needs you from the boolean or the string the URL carries", () => {
    expect(parseNeedsFilter(true)).toBe(true);
    expect(parseNeedsFilter("true")).toBe(true);
    expect(parseNeedsFilter(false)).toBeUndefined();
    expect(parseNeedsFilter("yes")).toBeUndefined();
  });

  it("keeps the existing stage and status parsers strict", () => {
    expect(parseWorkflowStage(3)).toBe(3);
    expect(parseWorkflowStage(7)).toBeUndefined();
    expect(parseRequestStatus("incomplete")).toBe("incomplete");
    expect(parseRequestStatus("approved")).toBeUndefined();
  });
});

describe("applyFilterChange", () => {
  it("applies a patch and leaves the other filters alone", () => {
    expect(
      applyFilterChange({ department: "records", needs: true }, { payment: "unpaid" }),
    ).toEqual({ department: "records", needs: true, payment: "unpaid" });
  });

  it("drops the stage when a status is chosen, since a status implies one", () => {
    expect(applyFilterChange({ stage: 1 }, { status: "processing" })).toEqual({
      stage: undefined,
      status: "processing",
    });
  });

  it("drops a status that lives in a different stage than the one chosen", () => {
    expect(applyFilterChange({ status: "processing" }, { stage: 2 })).toEqual({
      stage: 2,
      status: undefined,
    });
  });

  it("keeps a status that belongs to the stage chosen", () => {
    expect(applyFilterChange({ status: "incomplete" }, { stage: 2 })).toEqual({
      stage: 2,
      status: "incomplete",
    });
  });

  it("clears the stage and keeps the status when the All chip is chosen", () => {
    expect(applyFilterChange({ stage: 3 }, { stage: undefined })).toEqual({
      stage: undefined,
    });
  });
});
