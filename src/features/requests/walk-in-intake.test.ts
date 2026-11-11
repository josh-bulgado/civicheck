import { beforeEach, expect, it, vi } from "vitest";
import config from "~/features/services/fixtures/birth-delayed-requirements.json";
import marriageForms from "./fixtures/marriage-walk-in-forms.json";
import deathForms from "./fixtures/death-walk-in-forms.json";
import courtForm from "./fixtures/court-decree-walk-in-form.json";
import legitimationForm from "./fixtures/legitimation-walk-in-form.json";
import ra9255Form from "../forms/fixtures/ra9255-charter.json";
import supplementalForm from "./fixtures/supplemental-walk-in-form.json";
import { parseFormTemplateDefinition } from "~/features/forms/form-template.utils";
import { emptySubject } from "~/lib/subject-fields";

const state = vi.hoisted(() => ({
  create: vi.fn(),
  version: "published",
  serviceCode: "DCOLB-0079-NORMAL-MARITAL",
  departmentId: "birth",
  serviceDepartment: "birth",
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({ handler: (handler: unknown) => handler }),
  }),
}));
vi.mock("~/server/auth", () => ({
  requireActiveSession: async () => ({
    user: { id: "staff" },
    role: "staff",
    departmentId: state.departmentId,
    supabase: {
      from: () => {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: {
              service_code: state.serviceCode,
              fee: state.serviceCode === "RA9255_SURNAME" ? 355 : 500,
              fee_per_copy: false,
              department_id: state.serviceDepartment,
            },
          }),
          single: async () => ({
            data: { active_version_id: state.version },
            error: null,
          }),
          insert: async () => ({ error: null }),
        };
        return query;
      },
    },
  }),
}));
vi.mock("~/features/requests/tracking-number", () => ({
  insertRequestWithTrackingNumber: state.create,
}));
vi.mock("~/features/services/services.catalogue", () => ({
  loadServiceCatalogue: async () => ({
    formTemplatesByService: new Map([
      ["RA9255_SURNAME", { templateId: "ra9255", versionId: "published", definition: parseFormTemplateDefinition(ra9255Form.definition) }],
      ["SUPPLEMENTAL_REPORT", { templateId: "supplemental", versionId: "published", definition: parseFormTemplateDefinition(supplementalForm) }],
      ...["COURT-ANNULMENT", "COURT-FOREIGN-ADOPTION"].map(code => [code, {
        templateId: "court_decree", versionId: "published", definition: parseFormTemplateDefinition(courtForm),
      }] as const),
      ["LEGITIMATION", { templateId: "legitimation", versionId: "published", definition: parseFormTemplateDefinition(legitimationForm) }],
      ...(["DEATH_ONTIME", "DEATH_DELAYED"] as const).map(code => [code, {
        templateId: code, versionId: "published",
        definition: parseFormTemplateDefinition(code === "DEATH_ONTIME" ? deathForms.death_ontime : deathForms.death_delayed),
      }] as const),
      ...(["MARRIAGE_ONTIME", "MARRIAGE_DELAYED"] as const).map(code => [code, {
        templateId: code, versionId: "published",
        definition: parseFormTemplateDefinition(code === "MARRIAGE_ONTIME" ? marriageForms.marriage_ontime : marriageForms.marriage_delayed),
      }] as const),
      [
        "DCOLB-0079-NORMAL-MARITAL",
        {
          templateId: "birth",
          versionId: "published",
          definition: parseFormTemplateDefinition(config.definition),
        },
      ],
    ]),
    servicesByCode: new Map([
      ["RA9255_SURNAME", { party_roles: ["Child", "Mother", "Father"] }],
      ["SUPPLEMENTAL_REPORT", { party_roles: ["Subject"] }],
      ["COURT-ANNULMENT", { party_roles: ["Husband", "Wife"] }],
      ["COURT-FOREIGN-ADOPTION", { party_roles: ["Subject"] }],
      ["LEGITIMATION", { party_roles: ["Child", "Mother", "Father"] }],
      ["DEATH_ONTIME", { party_roles: ["Subject"] }],
      ["DEATH_DELAYED", { party_roles: ["Subject"] }],
      ["MARRIAGE_ONTIME", { party_roles: ["Bride", "Groom"] }],
      ["MARRIAGE_DELAYED", { party_roles: ["Bride", "Groom"] }],
      ["DCOLB-0079-NORMAL-MARITAL", { party_roles: ["Child", "Mother"] }],
    ]),
  }),
}));
import { encodeWalkInFn } from "./walk-in-intake.mutations";

it.each(["yes", "no"])("accepts checked R.A. 9255 walk-ins with acknowledgment %s and no online filer questions", async (fatherOnRecord) => {
  state.serviceCode = "RA9255_SURNAME";
  state.departmentId = state.serviceDepartment = "legal";
  const people = ["Child", "Mother", "Father"].map(role => ({
    ...emptySubject(role), firstName: role === "Father" ? "Juan" : "Ana", middleName: "Santos", lastName: "Cruz", sex: role === "Father" ? "male" : "female",
  }));
  const answers = { subjects: people, event_date: "2010-01-01", event_place: "Legazpi City, Albay", father_on_record: fatherOnRecord };
  const input = {
    serviceCode: "RA9255_SURNAME", subjects: people, templateVersionId: "published",
    physicalDocumentsConfirmed: true, personalAppearanceConfirmed: true,
    answers: { ...answers, filer_relationship: "other_relative", purpose: "ignored" },
  };
  const result = await encodeWalkInFn({ data: input });
  expect(result).toMatchObject({ error: false, status: "processing" });
  const saved = state.create.mock.calls[0][1];
  expect(saved).toMatchObject({
    applicant_id: null, request_type: "RA9255_SURNAME", status: "processing", fees_due: 355,
    form_template_version_id: "published", walk_in_accepted_by: "staff",
    form_data: {
      subject_first_name: "Ana", party2_role: "Mother", party3_role: "Father",
      father_on_record: fatherOnRecord, personal_appearance_confirmed: "true", encoded_by: "staff", intake_channel: "walk_in",
    },
  });
  expect(saved.form_data).not.toHaveProperty("filer_relationship");
  expect(saved.form_data).not.toHaveProperty("purpose");
  expect(saved.form_data).not.toHaveProperty("couple_appearance_confirmed");
  state.create.mockClear();
  for (const patch of [
    { physicalDocumentsConfirmed: false }, { personalAppearanceConfirmed: false },
    { personalAppearanceConfirmed: undefined }, { personalAppearanceConfirmed: "true" as unknown as boolean },
    { templateVersionId: "old" }, { answers: undefined },
    ...["", "not_sure", "invalid"].map(value => ({ answers: { ...answers, father_on_record: value } })),
    { answers: { ...answers, event_date: "" } }, { answers: { ...answers, event_place: "" } },
    { answers: { ...answers, subjects: people.slice(0, 2) } },
  ]) expect((await encodeWalkInFn({ data: { ...input, ...patch } })).error).toBe(true);
  state.version = "new-version";
  expect((await encodeWalkInFn({ data: input })).error).toBe(true);
  state.version = "published";
  state.departmentId = "birth";
  expect((await encodeWalkInFn({ data: input })).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
});

const subjects = ["Child", "Mother"].map((role) => ({
  ...emptySubject(role),
  firstName: "Ana",
  middleName: "Santos",
  lastName: "Cruz",
  sex: "female",
}));
const data = {
  physicalDocumentsConfirmed: true,
  serviceCode: "DCOLB-0079-NORMAL-MARITAL",
  subjects,
  templateVersionId: "published",
  answers: {
    subjects,
    event_date: "2000-01-01",
    event_place: "Gogon, Legazpi City, Albay",
    program: "normal",
    marital: "marital",
    has_foreign_parent: "no",
    out_of_town: "no",
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  state.version = "published";
  state.serviceCode = "DCOLB-0079-NORMAL-MARITAL";
  state.departmentId = "birth";
  state.serviceDepartment = "birth";
  state.create.mockResolvedValue({
    error: false,
    requestId: "new",
    trackingNumber: "CCRO-TEST",
  });
});

it("saves the template answers with staff walk-in identity and the registry fee", async () => {
  expect((await encodeWalkInFn({ data })).error).toBe(false);
  expect(state.create).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      applicant_id: null,
      request_type: data.serviceCode,
      fees_due: 500,
      form_template_version_id: "published",
      status: "processing",
      walk_in_accepted_by: "staff",
      form_data: expect.objectContaining({
        subject_first_name: "Ana",
        party2_role: "Mother",
        event_date: "2000-01-01",
        intake_channel: "walk_in",
        encoded_by: "staff",
      }),
    }),
  );
});
it("rejects old forms, invalid answers, and mismatched age groups before saving", async () => {
  for (const changed of [
    { ...data, templateVersionId: "old" },
    { ...data, answers: { ...data.answers, event_place: "" } },
    { ...data, answers: { ...data.answers, event_date: "1900-01-01" } },
  ])
    expect((await encodeWalkInFn({ data: changed })).error).toBe(true);
  state.version = "newly-published";
  expect((await encodeWalkInFn({ data })).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
});
it("keeps department restrictions on the birth walk-in endpoint", async () => {
  state.serviceDepartment = "another-department";
  expect((await encodeWalkInFn({ data })).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
});

it.each([undefined, false, "true"])("refuses unchecked or spoofed physical acceptance (%j)", async (confirmation) => {
  const result = await encodeWalkInFn({data: {...data, physicalDocumentsConfirmed: confirmation as boolean}});
  expect(result.error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
});

it("uses the selected service without asking for its case answers again", async () => {
  const details = { ...data.answers, program: "", marital: "" };
  expect((await encodeWalkInFn({ data: { ...data, answers: details } })).error).toBe(false);
  expect(state.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    form_data: expect.objectContaining({ program: "normal", marital: "marital" }),
  }));
});

it("saves the optional father full name on CTC walk-ins and rejects invalid names", async () => {
  state.serviceCode = "CTC-LOCAL";
  expect((await encodeWalkInFn({data: {...data, serviceCode: "CTC-LOCAL", fatherName: "Juan Santos Cruz"}})).error).toBe(false);
  expect(state.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({form_data: expect.objectContaining({father_name: "Juan Santos Cruz"})}));
  expect(state.create.mock.calls[0][1].status).toBeUndefined();
  expect(state.create.mock.calls[0][1].walk_in_accepted_by).toBeUndefined();
  state.create.mockClear();
  expect((await encodeWalkInFn({data: {...data, serviceCode: "CTC-LOCAL", fatherName: "123"}})).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
});

const marriageSubjects = ["Bride", "Groom"].map(role => ({ ...emptySubject(role), firstName: role === "Bride" ? "Ana" : "Juan", middleName: "Santos", lastName: "Cruz" }));
it.each(["MARRIAGE_ONTIME", "MARRIAGE_DELAYED"])("encodes the complete %s form after physical acceptance", async serviceCode => {
  state.serviceCode = serviceCode;
  state.departmentId = state.serviceDepartment = "marriage";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const answers = {
    subjects: marriageSubjects, marriage_license_basis: "with_license", solemnized_in_legazpi: "yes",
    has_marriage_agreement: "no", registration_type: "delayed", event_place: "Legazpi City, Albay",
    event_date: serviceCode === "MARRIAGE_ONTIME" ? today : "2000-01-01",
  };
  const input = { ...data, serviceCode, subjects: marriageSubjects, answers };
  expect((await encodeWalkInFn({ data: input })).error).toBe(false);
  expect(state.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    status: "processing", walk_in_accepted_by: "staff", form_template_version_id: "published",
    form_data: expect.objectContaining({ event_date: answers.event_date, event_place: answers.event_place,
      subject_role: "Bride", party2_role: "Groom", intake_channel: "walk_in" }),
  }));
  state.create.mockClear();
  for (const patch of [
    { physicalDocumentsConfirmed: false }, { templateVersionId: "old" },
    { answers: { ...answers, event_date: serviceCode === "MARRIAGE_ONTIME" ? "2000-01-01" : today } },
    { answers: { ...answers, event_place: "" } },
    { answers: { ...answers, subjects: [{ ...marriageSubjects[0], middleName: "" }, marriageSubjects[1]] } },
  ]) expect((await encodeWalkInFn({ data: { ...input, ...patch } })).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
  if (serviceCode === "MARRIAGE_DELAYED") {
    expect((await encodeWalkInFn({ data: { ...input, answers: {
      ...answers, registration_type: "reconstruction", has_children: "no", event_date: today,
    } } })).error).toBe(false);
    expect(state.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      form_data: expect.objectContaining({ registration_type: "reconstruction", has_children: "no" }),
    }));
  }
});

const deceased = [{ ...emptySubject("Subject"), firstName: "Juan", middleName: "Santos", lastName: "Cruz", sex: "male" }];
it("encodes legitimation from checked papers without redundant eligibility or filer questions", async () => {
  state.serviceCode = "LEGITIMATION";
  state.departmentId = state.serviceDepartment = "legal";
  const people = ["Child", "Mother", "Father"].map(role => ({
    ...emptySubject(role), firstName: role === "Father" ? "Juan" : "Ana", middleName: "Santos", lastName: "Cruz", sex: role === "Father" ? "male" : "female",
  }));
  const input = {
    ...data, serviceCode: "LEGITIMATION", subjects: people, coupleAppearanceConfirmed: true,
    answers: { subjects: people, event_date: "2000-01-01", event_place: "Legazpi City, Albay", marriage_date: "2005-01-01", father_on_record: "no" },
  };
  expect((await encodeWalkInFn({ data: input })).error).toBe(false);
  expect(state.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    status: "processing", walk_in_accepted_by: "staff", form_template_version_id: "published",
    form_data: expect.objectContaining({ party2_role: "Mother", party3_role: "Father", father_on_record: "no", couple_appearance_confirmed: "true" }),
  }));
  state.create.mockClear();
  for (const patch of [
    { physicalDocumentsConfirmed: false }, { coupleAppearanceConfirmed: false },
    { coupleAppearanceConfirmed: undefined }, { templateVersionId: "old" },
    { answers: { ...input.answers, father_on_record: "" } },
    { answers: { ...input.answers, father_on_record: "not_sure" } },
    { answers: { ...input.answers, marriage_date: "" } },
    { answers: { ...input.answers, subjects: people.slice(0, 2) } },
  ]) expect((await encodeWalkInFn({ data: { ...input, ...patch } })).error).toBe(true);
  state.serviceDepartment = "birth";
  expect((await encodeWalkInFn({ data: input })).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
});
it.each(["DEATH_ONTIME", "DEATH_DELAYED"])("encodes checked %s papers with the death form and validation", async serviceCode => {
  state.serviceCode = serviceCode;
  state.departmentId = state.serviceDepartment = "death";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const answers = {
    subjects: deceased, died_in_legazpi: "yes", disposal_method: "buried", embalmed: "yes",
    death_registration_basis: "beyond_30_days", event_place: "Gogon, Legazpi City, Albay",
    event_date: serviceCode === "DEATH_ONTIME" ? today : "2000-01-01",
  };
  const input = { ...data, serviceCode, subjects: deceased, answers };
  expect((await encodeWalkInFn({ data: input })).error).toBe(false);
  expect(state.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    status: "processing", walk_in_accepted_by: "staff", form_template_version_id: "published",
    form_data: expect.objectContaining({ event_date: answers.event_date, event_place: answers.event_place,
      subject_first_name: "Juan", died_in_legazpi: "yes", disposal_method: "buried", intake_channel: "walk_in" }),
  }));
  state.create.mockClear();
  for (const patch of [
    { physicalDocumentsConfirmed: false }, { templateVersionId: "old" },
    { answers: { ...answers, event_date: serviceCode === "DEATH_ONTIME" ? "2000-01-01" : today } },
    { answers: { ...answers, died_in_legazpi: "no" } },
    { answers: { ...answers, event_place: "" } },
    { answers: { ...answers, embalmed: "" } },
    { answers: { ...answers, subjects: [{ ...deceased[0], middleName: "" }] } },
  ]) expect((await encodeWalkInFn({ data: { ...input, ...patch } })).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
  state.serviceDepartment = "birth";
  expect((await encodeWalkInFn({ data: input })).error).toBe(true);
  state.serviceDepartment = "death";
  if (serviceCode === "DEATH_DELAYED") {
    expect((await encodeWalkInFn({ data: { ...input, answers: {
      ...answers, death_registration_basis: "no_existing_record", event_date: today,
    } } })).error).toBe(false);
  }
});

it.each(["COURT-ANNULMENT", "COURT-FOREIGN-ADOPTION"])("encodes checked %s court papers without purpose or sex", async serviceCode => {
  state.serviceCode=serviceCode;state.departmentId=state.serviceDepartment="legal";
  const people=(serviceCode === "COURT-ANNULMENT" ? ["Husband","Wife"] : ["Subject"]).map(role => ({
    ...emptySubject(role),firstName:"Ana",middleName:"Santos",lastName:"Cruz",sex:"",
  }));
  const answers={subjects:people,event_date:"2000-01-01",event_place:"RTC Legazpi City",issued_by_rtc_legazpi:"yes"};
  const input={...data,serviceCode,subjects:people,answers};
  expect((await encodeWalkInFn({data:input})).error).toBe(false);
  expect(state.create).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({
    status:"processing",walk_in_accepted_by:"staff",form_template_version_id:"published",
    form_data:expect.objectContaining({event_date:"2000-01-01",issued_by_rtc_legazpi:"yes",subject_first_name:"Ana"}),
  }));
  expect(state.create.mock.calls.at(-1)?.[1].form_data).not.toHaveProperty("purpose");
  state.create.mockClear();
  for (const patch of [
    {physicalDocumentsConfirmed:false}, {templateVersionId:"old"},
    {answers:{...answers,issued_by_rtc_legazpi:"not_sure"}},
    {answers:{...answers,issued_by_rtc_legazpi:""}},
    {answers:{...answers,event_date:""}}, {answers:{...answers,event_place:""}},
    {answers:{...answers,subjects:[]}},
  ]) expect((await encodeWalkInFn({data:{...input,...patch}})).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
  expect((await encodeWalkInFn({data:{...input,answers:{...answers,issued_by_rtc_legazpi:"no"}}})).error).toBe(false);
  state.create.mockClear();state.departmentId="birth";
  expect((await encodeWalkInFn({data:input})).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
});

it.each(["birth", "death", "marriage"])("encodes a checked supplemental %s record without unnecessary questions", async record_type => {
  state.serviceCode = "SUPPLEMENTAL_REPORT";
  state.departmentId = state.serviceDepartment = "legal";
  const people = [{ ...emptySubject("Subject"), firstName: "Ana", middleName: "Santos", lastName: "Cruz" }];
  const answers = { subjects: people, record_type, event_date: "2000-01-01", event_place: "Legazpi City",
    entry_to_supplement: "Citizenship", information_to_add: "Filipino", purpose: "unused", additional_notes: "unused" };
  const input = { ...data, serviceCode: "SUPPLEMENTAL_REPORT", subjects: people, answers, personalAppearanceConfirmed: true };
  expect((await encodeWalkInFn({ data: input })).error).toBe(false);
  const saved = state.create.mock.calls.at(-1)?.[1];
  expect(saved).toMatchObject({ applicant_id: null, status: "processing", walk_in_accepted_by: "staff",
    form_data: { record_type, entry_to_supplement: "Citizenship", information_to_add: "Filipino", personal_appearance_confirmed: "true" } });
  expect(saved.form_data).not.toHaveProperty("purpose");
  expect(saved.form_data).not.toHaveProperty("additional_notes");
  expect(saved.form_data.subject_sex).toBeFalsy();
  state.create.mockClear();
  for (const patch of [
    { physicalDocumentsConfirmed: false }, { personalAppearanceConfirmed: false }, { templateVersionId: "old" },
    ...["record_type", "event_date", "event_place", "entry_to_supplement", "information_to_add"].map(key => ({ answers: { ...answers, [key]: "" } })),
    { answers: { ...answers, subjects: [] } }, { answers: { ...answers, record_type: "other" } },
  ]) expect((await encodeWalkInFn({ data: { ...input, ...patch } })).error).toBe(true);
  state.departmentId = "birth";
  expect((await encodeWalkInFn({ data: input })).error).toBe(true);
  expect(state.create).not.toHaveBeenCalled();
});
