import { describe, expect, it } from "vitest";
import {
  filterDateBounds,
  problemReference,
  reviewFiltersSchema,
  reviewSubmissionSchema,
  satisfactionPercent,
  submitFeedbackSchema,
  submitProblemSchema,
} from "./feedback";

const requestId = "00000000-0000-4000-8000-000000000001";
describe("feedback validation", () => {
  it("requires an overall rating and keeps all other questions optional", () => {
    expect(submitFeedbackSchema.parse({ requestId, rating: 4 })).toEqual({
      requestId,
      rating: 4,
      easeRating: null,
      topics: [],
      comment: "",
    });
    for (const rating of [undefined, 0, 6, 1.5, "5"])
      expect(
        submitFeedbackSchema.safeParse({ requestId, rating }).success,
      ).toBe(false);
  });
  it("trims comments and deduplicates known topics", () => {
    expect(
      submitFeedbackSchema.parse({
        requestId,
        rating: 2,
        topics: ["uploads", "uploads"],
        comment: " Good ",
      }).topics,
    ).toEqual(["uploads"]);
    expect(
      submitFeedbackSchema.safeParse({
        requestId,
        rating: 2,
        topics: ["unknown"],
      }).success,
    ).toBe(false);
  });
  it("rejects blank problems and strips surrounding whitespace", () => {
    expect(
      submitProblemSchema.safeParse({ category: "uploads", description: "  " })
        .success,
    ).toBe(false);
    expect(
      submitProblemSchema.parse({
        category: "uploads",
        description: " Failed ",
      }).description,
    ).toBe("Failed");
    expect(
      submitProblemSchema.safeParse({
        category: "uploads",
        description: "Failed",
        pagePath: "/apply?token=private",
      }).success,
    ).toBe(false);
  });
  it("keeps problem review states separate from feedback states", () => {
    expect(
      reviewSubmissionSchema.safeParse({
        kind: "feedback",
        id: requestId,
        status: "resolved",
      }).success,
    ).toBe(false);
    expect(
      reviewSubmissionSchema.safeParse({
        kind: "problem",
        id: requestId,
        status: "reviewed",
      }).success,
    ).toBe(false);
  });
  it("rejects invalid dates and inverted ranges without throwing during safeParse", () => {
    for (const from of ["2026-99-01", "2026-02-31", "tomorrow"])
      expect(reviewFiltersSchema.safeParse({ from }).success).toBe(false);
    expect(
      reviewFiltersSchema.safeParse({ from: "2026-11-02", until: "2026-11-01" })
        .success,
    ).toBe(false);
  });
  it("uses inclusive Philippine calendar dates for filtering", () => {
    expect(
      filterDateBounds({ from: "2026-11-08", until: "2026-11-08" }),
    ).toEqual({
      from: "2026-11-08T00:00:00+08:00",
      until: "2026-11-08T16:00:00.000Z",
    });
  });
  it("shows no satisfaction percentage for an empty sample", () => {
    expect(satisfactionPercent({ total: 0, satisfied: 0 })).toBeNull();
    expect(satisfactionPercent({ total: 3, satisfied: 2 })).toBe(67);
    expect(problemReference(42)).toBe("PR-000042");
  });
});
