import { describe, expect, it } from "vitest";

import {
  applyFilterChange,
  getStatusBadgeVariant,
  parseAttentionFilter,
  parseMineFilter,
  parseNeedsFilter,
  parsePaymentFilter,
  parseRequestPage,
  parseRequestPageSize,
  parseRequestSearch,
  parseRequestSort,
  parseRequestStatus,
  parseSortDirection,
  parseWorkflowStage,
} from "./request-queue";

describe("status badge variants", () => {
  it("distinguishes validation blue from processing purple", () => {
    expect(getStatusBadgeVariant("under_validation")).toBe("info");
    expect(getStatusBadgeVariant("processing")).toBe("progress");
  });
});

describe("search param parsers", () => {
  it("accepts only the known payment filters", () => {
    expect(parsePaymentFilter("unpaid")).toBe("unpaid");
    expect(parsePaymentFilter("verified")).toBe("verified");
    expect(parsePaymentFilter("paid")).toBeUndefined();
    expect(parsePaymentFilter(undefined)).toBeUndefined();
  });

  it("reads Needs attention from the boolean or the string the URL carries", () => {
    expect(parseAttentionFilter(true)).toBe(true);
    expect(parseAttentionFilter("true")).toBe(true);
    expect(parseAttentionFilter(false)).toBeUndefined();
    expect(parseAttentionFilter("yes")).toBeUndefined();
    expect(parseNeedsFilter("true")).toBe(true);
    expect(parseMineFilter("true")).toBe(true);
  });

  it("keeps the existing stage and status parsers strict", () => {
    expect(parseWorkflowStage(3)).toBe(3);
    expect(parseWorkflowStage(7)).toBeUndefined();
    expect(parseRequestStatus("incomplete")).toBe("incomplete");
    expect(parseRequestStatus("approved")).toBeUndefined();
  });

  it("keeps queue paging and sorting inputs bounded", () => {
    expect(parseRequestPage(2)).toBe(2);
    expect(parseRequestPage(0)).toBeUndefined();
    expect(parseRequestPage(100_001)).toBeUndefined();
    expect(parseRequestPageSize("50")).toBe(50);
    expect(parseRequestPageSize(500)).toBeUndefined();
    expect(parseRequestSort("createdAt")).toBe("createdAt");
    expect(parseRequestSort("drop table")).toBeUndefined();
    expect(parseSortDirection("false")).toBe(false);
    expect(parseRequestSearch("x".repeat(120))).toHaveLength(100);
  });
});

describe("applyFilterChange", () => {
  it("applies a patch and leaves the other filters alone", () => {
    expect(
      applyFilterChange(
        { department: "records", attention: true },
        { payment: "unpaid" },
      ),
    ).toEqual({ department: "records", attention: true, payment: "unpaid" });
  });

  it("drops the stage when a status is chosen, since a status implies one", () => {
    expect(applyFilterChange({ stage: 1 }, { status: "processing" })).toEqual({
      stage: undefined,
      status: "processing",
    });
  });

  it("keeps work and attention filters mutually exclusive", () => {
    expect(applyFilterChange({ needs: true }, { attention: true })).toEqual({
      needs: undefined,
      mine: undefined,
      attention: true,
    });
    expect(applyFilterChange({ attention: true }, { needs: true })).toEqual({
      attention: undefined,
      needs: true,
      mine: undefined,
    });
    expect(applyFilterChange({ needs: true }, { mine: true })).toEqual({
      needs: undefined,
      mine: true,
      attention: undefined,
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
