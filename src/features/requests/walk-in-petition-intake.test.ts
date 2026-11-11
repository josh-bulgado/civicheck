import { beforeEach, expect, it, vi } from "vitest";
import fixture from "../forms/fixtures/petition-charter.json";
import { parseFormTemplateDefinition } from "../forms/form-template.utils";
import { emptySubject } from "~/lib/subject-fields";

const state = vi.hoisted(() => ({ create: vi.fn(), version: "published", department: "legal", service: "RA9048-CCE" }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ validator: () => ({ handler: (handler: unknown) => handler }) }) }));
vi.mock("~/server/auth", () => ({ requireActiveSession: async () => ({ user: { id: "legal-staff" }, role: "staff", departmentId: state.department,
  supabase: { from: () => {
    const query = { select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: { service_code: state.service, fee: state.service === "RA9048-CCE" ? 1200 : 3200, fee_per_copy: false, department_id: "legal" } }),
      single: async () => ({ data: { active_version_id: state.version }, error: null }) };
    return query;
  } },
}) }));
vi.mock("~/features/requests/tracking-number", () => ({ insertRequestWithTrackingNumber: state.create }));
vi.mock("~/features/services/services.catalogue", () => ({ loadServiceCatalogue: async () => ({
  formTemplatesByService: new Map(["RA9048-CCE", "RA9048-CFN"].map(code => [code, { templateId: "petition", versionId: "published", definition: parseFormTemplateDefinition(fixture.definition) }])),
  servicesByCode: new Map(["RA9048-CCE", "RA9048-CFN"].map(code => [code, { party_roles: ["Subject"] }])),
}) }));
import { encodeWalkInFn } from "./walk-in-intake.mutations";

const subjects = [{ ...emptySubject("Subject"), firstName: "Ana", middleName: "Santos", lastName: "Cruz", sex: "female" }];
const data = { serviceCode: "RA9048-CCE", subjects, templateVersionId: "published", physicalDocumentsConfirmed: true, petitionAuthorityConfirmed: true,
  answers: { subjects, record_type: "birth", event_date: "2000-01-01", event_place: "Legazpi City, Albay", other_entry: "Place", other_current: "Legaspi", other_correct: "Legazpi" },
};
beforeEach(() => {
  vi.clearAllMocks(); state.version = "published"; state.department = "legal"; state.service = "RA9048-CCE";
  state.create.mockResolvedValue({ error: false, requestId: "new", trackingNumber: "CCRO-TEST" });
});
it("accepts a checked legal walk-in without online-only answers or uploads", async () => {
  expect(await encodeWalkInFn({ data })).toMatchObject({ error: false, status: "processing" });
  expect(state.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    applicant_id: null, request_type: "RA9048-CCE", fees_due: 1200, status: "processing", walk_in_accepted_by: "legal-staff",
    form_data: expect.objectContaining({ correct_other: "yes", petition_authority_confirmed: "true", physical_documents_confirmed: "true", intake_channel: "walk_in" }),
  }));
});
it("rejects unchecked papers, unchecked authority, stale forms, and another department", async () => {
  for (const patch of [{ physicalDocumentsConfirmed: false }, { petitionAuthorityConfirmed: false }, { templateVersionId: "old" }]) {
    expect(await encodeWalkInFn({ data: { ...data, ...patch } })).toMatchObject({ error: true });
  }
  state.department = "birth";
  expect(await encodeWalkInFn({ data })).toMatchObject({ error: true });
  state.department = "legal"; state.version = "new";
  expect(await encodeWalkInFn({ data })).toMatchObject({ error: true });
  expect(state.create).not.toHaveBeenCalled();
});
it("rejects a clerical-only petition encoded under the higher-fee variant", async () => {
  state.service = "RA9048-CFN";
  const answers = { ...data.answers, change_first_name: "no", correct_sex: "no", correct_birth_day_month: "no", correct_other: "yes" };
  expect(await encodeWalkInFn({ data: { ...data, serviceCode: state.service, answers } })).toMatchObject({ error: true });
  expect(state.create).not.toHaveBeenCalled();
});
