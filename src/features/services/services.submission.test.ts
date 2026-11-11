import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ongoing: [] as { id: string; tracking_number: string; form_data: Record<string, string>; copies: number }[],
  create: vi.fn(),
  requesterFields: false,
  marriageFields: false,
  profile: { first_name: "Ana", middle_name: null as string | null, last_name: "Reyes", suffix: "", has_no_middle_name: true } as { first_name: string; middle_name: string | null; last_name: string; suffix: string; has_no_middle_name: boolean } | null,
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: { parse: (data: unknown) => unknown }) => ({
      handler: (handler: (input: { data: unknown }) => unknown) =>
        (input: { data: unknown }) => handler({ data: schema.parse(input.data) }),
    }),
  }),
}));
vi.mock("~/server/auth", () => ({
  requireActiveSession: async () => ({
    user: { id: "owner" },
    supabase: { from: (table: string) => {
      const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: table === "profiles" ? state.profile : null, error: null }) };
      return q;
    } },
  }),
}));
vi.mock("~/utils/supabase", () => ({
  getSupabaseAdminClient: () => ({ from: () => {
    const q = {
      select: () => q, eq: () => q, not: () => q, order: () => q,
      maybeSingle: async () => ({ data: null, error: null }),
      range: async (start: number, end: number) => ({ data: state.ongoing.slice(start, end + 1), error: null }),
      insert: async () => ({ error: null }),
    };
    return q;
  } }),
}));
vi.mock("~/features/requests/tracking-number", () => ({ insertRequestWithTrackingNumber: state.create }));
vi.mock("~/features/apply/apply-upload-drafts.server", () => ({ finalizeRequestUploadDraft: vi.fn() }));
vi.mock("~/features/services/services.catalogue", () => ({
  loadServiceCatalogue: async () => ({ requirementsByGroup: new Map() }),
  resolveServices: () => ({
    services: [{ service_code: "TEST", name: "Test", fee: 0, fee_per_copy: true }],
    isGroup: false,
  }),
}));
vi.mock("~/features/forms/form-template.utils", () => ({
  buildLegacyFormDefinition: () => ({ sections: state.marriageFields ? [{ fields: [
    { key: "account_party_role", type: "select" }, { key: "subjects", type: "person_group" },
  ] }] : state.requesterFields ? [{ fields: [
    { key: "requester_first_name" }, { key: "requester_middle_name" }, { key: "requester_last_name" }, { key: "requester_suffix" },
  ] }] : [] }),
  canonicalizeTemplateAnswers: (_: unknown, answers: unknown) => answers,
  flattenTemplateAnswers: (_: unknown, answers: unknown) => ({ ...(answers as object) }),
  parseFormTemplateDefinition: vi.fn(),
  validateCaseSelectorAnswers: () => ({ success: true }),
  validateTemplateAnswers: () => ({ success: true }),
}));
import { submitRequestFn } from "./services.mutations";

const duplicateId = "00000000-0000-4000-8000-000000000001";
const answers = { subject_first_name: "Ana", subject_last_name: "Reyes", event_place: "Legazpi" };
const submit = (acknowledgedDuplicateId?: string) => submitRequestFn({ data: {
  serviceCode: "TEST", submissionId: "00000000-0000-4000-8000-000000000002",
  templateVersionId: null, uploadDraftId: null, answers, copies: 1, acknowledgedDuplicateId,
} });
beforeEach(() => {
  vi.clearAllMocks();
  state.requesterFields = false;
  state.marriageFields = false;
  state.profile = { first_name: "Ana", middle_name: null, last_name: "Reyes", suffix: "", has_no_middle_name: true };
  state.ongoing = [{ id: duplicateId, tracking_number: "CCRO-EXISTING", form_data: { ...answers }, copies: 1 }];
  state.create.mockResolvedValue({ error: false, requestId: "new", trackingNumber: "CCRO-NEW" });
});
describe("shared submission duplicate rules", () => {
  it("blocks an identical application even when the override is sent directly", async () => {
    const result = await submit(duplicateId);
    expect(result.error).toBe(true);
    expect(result.duplicateRequest?.identical).toBe(true);
    expect(state.create).not.toHaveBeenCalled();
  });
  it("warns about different details, then accepts acknowledgment", async () => {
    state.ongoing[0].form_data.event_place = "Manila";
    expect((await submit()).duplicateRequest?.identical).toBe(false);
    expect(state.create).not.toHaveBeenCalled();
    expect((await submit(duplicateId)).error).toBe(false);
    expect(state.create).toHaveBeenCalledOnce();
  });
  it("does not accept an unrelated acknowledgment", async () => {
    state.ongoing[0].form_data.event_place = "Manila";
    expect((await submit("00000000-0000-4000-8000-000000000099")).error).toBe(true);
    expect(state.create).not.toHaveBeenCalled();
  });
  it("allows different subjects without a warning", async () => {
    state.ongoing[0].form_data.subject_first_name = "Maria";
    expect((await submit()).error).toBe(false);
    expect(state.create).toHaveBeenCalledOnce();
  });
  it("checks later pages for an exact match before offering the override", async () => {
    const exact = state.ongoing[0];
    state.ongoing = Array.from({ length: 100 }, (_, i) => ({
      ...exact, id: String(i), form_data: { ...answers, event_place: "Manila" },
    }));
    state.ongoing.push(exact);
    expect((await submit()).duplicateRequest?.identical).toBe(true);
    expect(state.create).not.toHaveBeenCalled();
  });
});

describe("online requester identity", () => {
  const send = () => submitRequestFn({ data: {
    serviceCode: "EMAIL_INQUIRY", submissionId: "00000000-0000-4000-8000-000000000002",
    templateVersionId: null, uploadDraftId: null,
    answers: { ...answers, requester_first_name: "Someone", requester_last_name: "Else", requester_middle_name: "Fake", requester_suffix: "Jr." },
  } });
  it("uses the saved profile instead of tampered requester names and preserves the owner", async () => {
    state.requesterFields = true;
    state.ongoing = [];
    expect((await send()).error).toBe(false);
    expect(state.create.mock.calls[0][1].form_data).toMatchObject({
      ...answers, requester_first_name: "Ana", requester_last_name: "Reyes", requester_middle_name: "N/A", requester_suffix: "",
    });
  });
  it("blocks submission when the profile cannot be read", async () => {
    state.requesterFields = true;
    state.profile = null;
    expect((await send()).error).toBe(true);
    expect(state.create).not.toHaveBeenCalled();
  });
});

describe.each(["MARRIAGE_LICENSE", "MARRIAGE_ONTIME", "MARRIAGE_DELAYED"])("account party for %s", (serviceCode) => {
  const parties = ["Bride", "Groom"].map((role) => ({
    role, firstName: "Someone", middleName: "Other", lastName: "Else",
    suffix: "", sex: role === "Bride" ? "female" : "male",
  }));
  const send = (role?: string, subjects = parties) => submitRequestFn({ data: {
    serviceCode, submissionId: "00000000-0000-4000-8000-000000000002",
    templateVersionId: null, uploadDraftId: null,
    answers: { ...(role ? { account_party_role: role } : {}), subjects },
  } });
  beforeEach(() => {
    state.marriageFields = true;
    state.ongoing = [];
  });
  it.each(["Bride", "Groom"])("overwrites tampered %s names with the saved profile and preserves the partner", async (role) => {
    expect((await send(role)).error).toBe(false);
    const saved = state.create.mock.calls[0][1].form_data;
    expect(saved.account_party_role).toBe(role);
    expect(saved.subjects.find((p: { role: string }) => p.role === role)).toMatchObject({
      firstName: "Ana", middleName: "", lastName: "Reyes", suffix: "", noMiddleName: true,
    });
    expect(saved.subjects.find((p: { role: string }) => p.role !== role))
      .toEqual(parties.find((p) => p.role !== role));
  });
  it.each([undefined, "Other", "Wife"])("rejects a missing or invalid internal role: %s", async (role) => {
    expect((await send(role)).error).toBe(true);
    expect(state.create).not.toHaveBeenCalled();
  });
  it("rejects missing profiles", async () => {
    state.profile = null;
    expect((await send("Bride")).error).toBe(true);
    expect(state.create).not.toHaveBeenCalled();
  });
  it("treats a blank account middle name as no middle name even without the old profile flag", async () => {
    state.profile!.has_no_middle_name = false;
    expect((await send("Bride")).error).toBe(false);
    expect(state.create.mock.calls[0][1].form_data.subjects[0]).toMatchObject({ middleName: "", noMiddleName: true });
  });
  it("rejects duplicated roles instead of overwriting two people", async () => {
    expect((await send("Bride", [parties[0], parties[0]])).error).toBe(true);
    expect(state.create).not.toHaveBeenCalled();
  });
  it("preserves the account middle name and suffix for the groom", async () => {
    state.profile = { first_name: "Juan", middle_name: "Santos", last_name: "Reyes", suffix: "Jr.", has_no_middle_name: false };
    expect((await send("Groom")).error).toBe(false);
    expect(state.create.mock.calls[0][1].form_data.subjects[1]).toMatchObject({
      firstName: "Juan", middleName: "Santos", lastName: "Reyes", suffix: "Jr.", noMiddleName: false,
    });
  });
});
