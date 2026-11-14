import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  deny: false,
  requestStatus: "released",
  requestExists: true,
  duplicate: false,
  requireSession: vi.fn(),
  writes: vi.fn(),
}));
const feedback = {
  id: "saved",
  rating: 4,
  ease_rating: null,
  topics: [],
  comment: "Helpful",
  created_at: "2026-11-08T00:00:00Z",
};
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({ handler: (fn: unknown) => fn }),
  }),
}));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: vi.fn() }));
vi.mock("~/server/auth", () => ({
  requireActiveSession: async (permission: string) => {
    state.requireSession(permission);
    if (state.deny) throw new Error("Forbidden");
    return {
      user: { id: "owner" },
      supabase: {
        from: (table: string) => {
          const query = {
            select: () => query,
            eq: () => query,
            insert: (values: unknown) => {
              state.writes(table, values);
              return query;
            },
            update: (values: unknown) => {
              state.writes(table, values);
              return query;
            },
            maybeSingle: async () => ({
              data:
                table === "requests"
                  ? state.requestExists
                    ? { id: "request", status: state.requestStatus }
                    : null
                  : feedback,
              error: null,
            }),
            single: async () =>
              table === "request_feedback" && state.duplicate
                ? { data: null, error: { code: "23505" } }
                : {
                    data:
                      table === "request_feedback"
                        ? feedback
                        : { id: "report", reference_number: 42 },
                    error: null,
                  },
          };
          return query;
        },
      },
    };
  },
}));
import {
  getAdminFeedbackFn,
  submitProblemReportFn,
  submitRequestFeedbackFn,
  updateSubmissionReviewFn,
} from "./feedback.functions";

beforeEach(() => {
  state.deny = false;
  state.requestStatus = "released";
  state.requestExists = true;
  state.duplicate = false;
  vi.clearAllMocks();
});
const input = {
  requestId: "request",
  rating: 4,
  easeRating: null,
  topics: [],
  comment: "Helpful",
};

describe("authenticated feedback endpoints", () => {
  it("derives the applicant identity from the verified session and returns the stored response", async () => {
    const result = await submitRequestFeedbackFn({ data: input });
    expect(state.requireSession).toHaveBeenCalledWith("requests:view_own");
    expect(state.writes).toHaveBeenCalledWith("request_feedback", {
      request_id: "request",
      applicant_id: "owner",
      rating: 4,
      ease_rating: null,
      topics: [],
      comment: "Helpful",
    });
    expect(result).toEqual({ error: false, feedback });
  });
  it("returns the existing response if two submissions race", async () => {
    state.duplicate = true;
    expect(await submitRequestFeedbackFn({ data: input })).toEqual({
      error: false,
      feedback,
    });
  });
  it.each(["submitted", "ready_for_release", "rejected"])(
    "does not write feedback on a %s request",
    async (status) => {
      state.requestStatus = status;
      expect((await submitRequestFeedbackFn({ data: input })).error).toBe(true);
      expect(state.writes).not.toHaveBeenCalled();
    },
  );
  it("does not write a problem report for inaccessible request context", async () => {
    state.requestExists = false;
    expect(
      (
        await submitProblemReportFn({
          data: {
            requestId: "someone-elses-request",
            category: "uploads",
            description: "Problem",
            pagePath: "/my-requests",
          },
        })
      ).error,
    ).toBe(true);
    expect(state.writes).not.toHaveBeenCalled();
  });
  it("returns the report reference after saving a general problem report", async () => {
    expect(
      await submitProblemReportFn({
        data: {
          requestId: null,
          category: "uploads",
          description: "Problem",
          pagePath: "/apply",
        },
      }),
    ).toEqual({ error: false, reference: "PR-000042" });
  });
  it("guards each endpoint independently of its route", async () => {
    state.deny = true;
    await expect(submitRequestFeedbackFn({ data: input })).rejects.toThrow(
      "Forbidden",
    );
    await expect(
      submitProblemReportFn({
        data: {
          requestId: null,
          category: "other",
          description: "Problem",
          pagePath: "",
        },
      }),
    ).rejects.toThrow("Forbidden");
    await expect(
      updateSubmissionReviewFn({
        data: { kind: "feedback", id: "feedback", status: "reviewed" },
      }),
    ).rejects.toThrow("Forbidden");
    await expect(
      getAdminFeedbackFn({
        data: { tab: "feedback", service: "", from: "", until: "", page: 1 },
      }),
    ).rejects.toThrow("Forbidden");
    expect(
      state.requireSession.mock.calls.map(([permission]) => permission),
    ).toEqual([
      "requests:view_own",
      "requests:view_own",
      "dashboard:admin",
      "dashboard:admin",
    ]);
    expect(state.writes).not.toHaveBeenCalled();
  });
});
