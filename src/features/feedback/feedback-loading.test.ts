import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  status: "released",
  feedbackError: false,
  requestExists: true,
  existingFeedback: false,
  from: vi.fn(),
  eq: vi.fn(),
}));
const savedFeedback = { id: "response", rating: 4, ease_rating: null, topics: [], comment: "Helpful", created_at: "2026-11-08T00:00:00Z" };

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { validator: () => builder, handler: (handler: unknown) => handler };
    return builder;
  },
}));
vi.mock("~/server/auth", () => ({
  requireActiveSession: async () => ({
    user: { id: "owner" },
    supabase: {
      from: (table: string) => {
        state.from(table);
        const query = {
          select: () => query,
          eq: (column: string, value: unknown) => { state.eq(table, column, value); return query; },
          order: () => query,
          single: async () => ({ data: state.requestExists ? {
            id: "request", tracking_number: "CCRO-2026-000010", status: state.status,
            request_type: "CTC-LOCAL", payment_status: "verified", form_data: {},
            created_at: "2026-11-08T00:00:00Z", updated_at: "2026-11-08T01:00:00Z",
            services_registry: { name: "Certified True Copy", allows_messages: false },
          } : null, error: null }),
          maybeSingle: async () => ({
            data: state.existingFeedback ? savedFeedback : null,
            error: state.feedbackError ? { message: "Feedback query failed" } : null,
          }),
          then: (resolve: (value: unknown) => unknown) => resolve({
            data: table === "requirements_attachments"
              ? [{ id: "document", requirement_name: "Valid ID", verification_status: "approved", previous_uploads: [] }]
              : [{ id: "log", action_status: state.status, created_at: "2026-11-08T01:00:00Z" }],
            error: null,
          }),
        };
        return query;
      },
    },
  }),
}));
vi.mock("~/features/requests/missing-uploads.server", () => ({ loadAddableUploads: vi.fn() }));
vi.mock("~/features/requests/request-messages.server", () => ({ readRequestMessages: vi.fn() }));
vi.mock("~/features/services/services.catalogue", () => ({ loadServiceCatalogue: vi.fn() }));
vi.mock("~/features/requests/request-field-labels", () => ({ requestFieldDisplayOf: () => ({ fieldLabels: {}, fieldDisplayValues: {} }) }));

import { getMyRequestDetailFn } from "~/features/requests/applicant-requests.queries";

beforeEach(() => {
  vi.clearAllMocks();
  state.status = "released";
  state.feedbackError = false;
  state.requestExists = true;
  state.existingFeedback = false;
});

describe("optional feedback on request details", () => {
  it("keeps request details, documents, and history available when only feedback fails", async () => {
    state.feedbackError = true;
    const result = await getMyRequestDetailFn({ data: { requestId: "request" } });
    expect(result).toMatchObject({
      id: "request", status: "released", feedback: null, feedbackUnavailable: true,
      attachments: [{ id: "document", verificationStatus: "approved" }],
      logs: [{ id: "log", actionStatus: "released" }],
    });
    expect(state.eq).toHaveBeenCalledWith("requests", "applicant_id", "owner");
  });

  it("returns a saved response when feedback becomes available again", async () => {
    state.existingFeedback = true;
    const result = await getMyRequestDetailFn({ data: { requestId: "request" } });
    expect(result).toMatchObject({ feedback: savedFeedback, feedbackUnavailable: false });
  });

  it("distinguishes no response from a failed feedback read", async () => {
    const result = await getMyRequestDetailFn({ data: { requestId: "request" } });
    expect(result).toMatchObject({ feedback: null, feedbackUnavailable: false });
  });

  it("does not read feedback before release", async () => {
    state.status = "ready_for_release";
    state.feedbackError = true;
    const result = await getMyRequestDetailFn({ data: { requestId: "request" } });
    expect(result).toMatchObject({ feedback: null, feedbackUnavailable: false });
    expect(state.from).not.toHaveBeenCalledWith("request_feedback");
  });

  it("still rejects an inaccessible request", async () => {
    state.requestExists = false;
    await expect(getMyRequestDetailFn({ data: { requestId: "request" } })).rejects.toThrow("Request not found");
    expect(state.from).not.toHaveBeenCalledWith("request_feedback");
  });
});
