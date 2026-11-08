import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  status: "submitted",
  serviceCode: "MARRIAGE_LICENSE",
  writes: vi.fn(),
  notify: vi.fn(),
  attachmentUpdateWins: true,
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ validator: () => ({ handler: (handler: unknown) => handler }) }),
}));
vi.mock("~/server/auth", () => ({
  requireActiveSession: async () => ({
    user: { id: "staff" }, role: "admin", departmentId: null,
    supabase: { rpc: async (_name: string, args: {p_values: unknown}) => {
      if (!state.attachmentUpdateWins) return {data: null, error: {message: "Another staff member already reviewed this document. Refresh and check their decision."}};
      state.writes("requirements_attachments", args.p_values);
      return {data: false, error: null};
    }, from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({ data: {
          id: "attachment", request_id: "request", requirement_name: "Bride: Valid ID",
          verification_status: "pending",
          requests: { status: state.status, request_type: state.serviceCode,
            tracking_number: "CCRO-2026-107218", claimed_by: "staff",
            claimed_stage: state.status, claim_expires_at: "2099-01-01T00:00:00.000Z",
            services_registry: { department_id: "ccro" } },
        }, error: null }),
        update: (values: unknown) => { state.writes(table, values); return query; },
        insert: (values: unknown) => { state.writes(table, values); return query; },
        then: (resolve: (value: unknown) => unknown) => resolve({
          data:
            table === "requirements_attachments" && state.attachmentUpdateWins
              ? [{ id: "attachment" }]
              : [],
          error: null,
        }),
      };
      return query;
    } },
  }),
}));
vi.mock("~/features/notifications/notifications.server", () => ({
  buildDocumentRejectedEmail: vi.fn(), buildPreValidationCompleteEmail: vi.fn(),
  buildStatusChangeEmail: vi.fn(), buildCashierClearedEmail: vi.fn(), dispatchApplicantNotification: state.notify,
}));

import { setAttachmentVerificationFn } from "./requests.mutations";
import { documentReviewBlockedReason } from "./document-review";

describe.each([
  "MARRIAGE_LICENSE", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL",
  "BIRTH_DELAYED", "MARRIAGE_ONTIME", "MARRIAGE_DELAYED",
  "DEATH_ONTIME", "DEATH_DELAYED", "CTC_ISSUANCE", "BIRTH_ONTIME",
  "LEGITIMATION", "ELEC_ENDORSEMENT", "COURT_DECREE", "SUPPLEMENTAL_REPORT",
  "OTHER_CERT", "EMAIL_INQUIRY", "FUTURE_SERVICE",
])("%s requires Start validation before document decisions", (serviceCode) => {
  beforeEach(() => {
    state.status = "submitted";
    state.serviceCode = serviceCode;
    state.attachmentUpdateWins = true;
    vi.clearAllMocks();
  });

  it("does not overwrite a document another staff member already reviewed", async () => {
    state.status = "under_validation";
    state.attachmentUpdateWins = false;
    const result = await setAttachmentVerificationFn({ data: {
      attachmentId: "00000000-0000-4000-8000-000000000001",
      status: "approved",
    } });
    expect(result).toEqual({
      error: true,
      message: "Another staff member already reviewed this document. Refresh and check their decision.",
    });
    expect(state.notify).not.toHaveBeenCalled();
  });

  it.each(["approved", "rejected"] as const)("blocks a direct %s call without changing files, status, audit or notifications", async (status) => {
    const result = await setAttachmentVerificationFn({ data: {
      attachmentId: "00000000-0000-4000-8000-000000000001", status, reason: "Unreadable",
    } });
    expect(result).toEqual({ error: true, message: "Start validation to review this document." });
    expect(state.writes).not.toHaveBeenCalled();
    expect(state.notify).not.toHaveBeenCalled();
  });

  it.each(["approved", "rejected"] as const)("allows %s after validation has started", async (status) => {
    state.status = "under_validation";
    const result = await setAttachmentVerificationFn({ data: {
      attachmentId: "00000000-0000-4000-8000-000000000001", status, reason: "Unreadable",
    } });
    expect(result).toEqual({ error: false });
    expect(state.writes).toHaveBeenCalledWith("requirements_attachments", {
      verification_status: status, rejection_reason: status === "rejected" ? "Unreadable" : null,
    });
    expect(state.writes).not.toHaveBeenCalledWith("requests", expect.anything());
  });

  it("unlocks review after validation starts, including incomplete requests", () => {
    expect(documentReviewBlockedReason("submitted")).toBeTruthy();
    expect(documentReviewBlockedReason("under_validation")).toBeNull();
    expect(documentReviewBlockedReason("incomplete")).toBeNull();
  });
});

describe("a closed request's documents", () => {
  beforeEach(() => {
    state.serviceCode = "MARRIAGE_LICENSE";
    state.attachmentUpdateWins = true;
    vi.clearAllMocks();
  });

  it.each(["released", "rejected"])("take no decision once the request is %s", async (status) => {
    state.status = status;
    const result = await setAttachmentVerificationFn({ data: {
      attachmentId: "00000000-0000-4000-8000-000000000001", status: "rejected", reason: "Unreadable",
    } });
    expect(result).toEqual({
      error: true, message: "This request is closed. Its documents can no longer change.",
    });
    expect(state.writes).not.toHaveBeenCalled();
    expect(state.notify).not.toHaveBeenCalled();
  });
});
