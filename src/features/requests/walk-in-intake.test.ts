import { beforeEach, expect, it, vi } from "vitest";
import config from "~/features/services/fixtures/birth-delayed-requirements.json";
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
              fee: 500,
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
      ["DCOLB-0079-NORMAL-MARITAL", { party_roles: ["Child", "Mother"] }],
    ]),
  }),
}));
import { encodeWalkInFn } from "./walk-in-intake.mutations";

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
