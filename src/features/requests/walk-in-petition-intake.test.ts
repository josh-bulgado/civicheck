import { beforeEach, expect, it, vi } from "vitest";
import fixture from "./fixtures/petition-walk-in-form.json";
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
  formTemplatesByService: new Map(["RA9048-CCE", "RA9048-CFN"].map(code => [code, { templateId: "petition", versionId: "published", definition: parseFormTemplateDefinition(fixture) }])),
  servicesByCode: new Map(["RA9048-CCE", "RA9048-CFN"].map(code => [code, { party_roles: ["Subject"] }])),
}) }));
import { encodeWalkInFn } from "./walk-in-intake.mutations";

const subjects = [{ ...emptySubject("Subject"), firstName: "Ana", middleName: "Santos", lastName: "Cruz", sex: "female" }];
const data = { serviceCode: "RA9048-CCE", subjects, templateVersionId: "published", physicalDocumentsConfirmed: true,
  answers: { subjects, record_type: "birth", event_date: "2000-01-01", event_place: "Legazpi City, Albay", other_entry: "Place", other_current: "Legaspi", other_correct: "Legazpi",
    mother_first_name: "Maria", mother_middle_name: "N/A", mother_last_name: "Santos", registered_late: "no" },
};
beforeEach(() => {
  vi.clearAllMocks(); state.version = "published"; state.department = "legal"; state.service = "RA9048-CCE";
  state.create.mockResolvedValue({ error: false, requestId: "new", trackingNumber: "CCRO-TEST" });
});
it("accepts a checked legal walk-in without online-only answers or uploads", async () => {
  expect(await encodeWalkInFn({ data })).toMatchObject({ error: false, status: "processing" });
  expect(state.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    applicant_id: null, request_type: "RA9048-CCE", fees_due: 1200, status: "processing", walk_in_accepted_by: "legal-staff",
    form_data: expect.objectContaining({ correct_other: "yes", physical_documents_confirmed: "true", intake_channel: "walk_in" }),
  }));
});
it("rejects unchecked papers, stale forms, and another department", async () => {
  for (const patch of [{ physicalDocumentsConfirmed: false }, { templateVersionId: "old" }]) {
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

it("accepts marriage names and registration details without birth-only fields", async () => {
  const answers = {...data.answers, record_type:"marriage", subjects:[{...subjects[0],sex:""}],
    wife_first_name:"Elena", wife_middle_name:"N/A", wife_last_name:"Reyes", registered_late:"yes", registered_late_when:"Estimated: 2001"};
  expect(await encodeWalkInFn({data:{...data,subjects:answers.subjects,answers}})).toMatchObject({error:false,status:"processing"});
  const saved = state.create.mock.calls[0][1].form_data;
  expect(saved).toMatchObject({wife_first_name:"Elena", registered_late_when:"Estimated: 2001", record_type:"marriage", primary_petition:"correct_other"});
  expect(saved).not.toHaveProperty("mother_first_name");
  expect(saved).not.toHaveProperty("filing_fee_exemption");
});
