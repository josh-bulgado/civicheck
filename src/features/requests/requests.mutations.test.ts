import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  status: "submitted",
  serviceCode: "MARRIAGE_LICENSE",
  writes: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ validator: () => ({ handler: (handler: unknown) => handler }) }),
}));
vi.mock("~/server/auth", () => ({
  requireActiveSession: async () => ({
    user: { id: "staff" }, role: "admin", departmentId: null,
    supabase: { from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({ data: {
          id: "attachment", request_id: "request", requirement_name: "Bride: Valid ID",
          requests: { status: state.status, request_type: state.serviceCode,
            tracking_number: "CCRO-2026-107218", services_registry: { department_id: "ccro" } },
        }, error: null }),
        update: (values: unknown) => { state.writes(table, values); return query; },
        insert: (values: unknown) => { state.writes(table, values); return query; },
        then: (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null }),
      };
      return query;
    } },
  }),
}));
vi.mock("~/features/notifications/notifications.server", () => ({
  buildDocumentRejectedEmail: vi.fn(), buildPreValidationCompleteEmail: vi.fn(),
  buildStatusChangeEmail: vi.fn(), dispatchApplicantNotification: state.notify,
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
    vi.clearAllMocks();
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
