import { describe, expect, it } from "vitest";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import { flattenSubjects, subjectsFromFormData } from "~/lib/subject-fields";
import { addableUploads } from "./missing-uploads";

function requirement(overrides: Partial<ServiceRequirement>): ServiceRequirement {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    service_code: "MARRIAGE_LICENSE",
    requirement_name: "Document",
    is_mandatory: false,
    requirement_group: "MARRIAGE_LICENSE",
    where_to_secure: null,
    case_tag: null,
    applies_when: null,
    requires_upload: true,
    upload_scope: "request",
    subject_role: null,
    ...overrides,
  };
}

const CENOMAR = requirement({
  id: "00000000-0000-4000-8000-000000000001",
  requirement_name: "CENOMAR",
  upload_scope: "each_subject",
});
const SEMINAR = requirement({
  id: "00000000-0000-4000-8000-000000000002",
  requirement_name: "Pre-marriage seminar certificate",
});
const IN_PERSON = requirement({
  id: "00000000-0000-4000-8000-000000000003",
  requirement_name: "Personal appearance",
  requires_upload: false,
});
const WIDOWED_ONLY = requirement({
  id: "00000000-0000-4000-8000-000000000004",
  requirement_name: "Death certificate of former spouse",
  applies_when: {
    match: "all",
    conditions: [{ field: "civil_status", operator: "equals", value: "widowed" }],
  } as ServiceRequirement["applies_when"],
});

const formData = {
  ...flattenSubjects([
    { role: "Groom", firstName: "Juan", middleName: "", lastName: "Cruz", suffix: "", sex: "male" },
    { role: "Bride", firstName: "Maria", middleName: "", lastName: "Santos", suffix: "", sex: "female" },
  ]),
  civil_status: "single",
};

const base = {
  requirements: [CENOMAR, SEMINAR, IN_PERSON, WIDOWED_ONLY],
  serviceCode: "MARRIAGE_LICENSE",
  partyRoles: ["Groom", "Bride"],
  formData,
};

describe("documents an applicant can still add", () => {
  it("offers every applicable upload slot that holds no file", () => {
    const slots = addableUploads({ ...base, attachments: [] });
    expect(slots.map((slot) => [slot.requirementName, slot.subjectRole])).toEqual([
      ["CENOMAR", "Groom"],
      ["CENOMAR", "Bride"],
      ["Pre-marriage seminar certificate", null],
    ]);
  });

  it("leaves out slots that already have a file, whatever its status", () => {
    const slots = addableUploads({
      ...base,
      attachments: [
        { requirementId: CENOMAR.id, requirementName: "CENOMAR", subjectRole: "Groom" },
        { requirementId: SEMINAR.id, requirementName: SEMINAR.requirement_name, subjectRole: null },
      ],
    });
    expect(slots.map((slot) => [slot.requirementName, slot.subjectRole])).toEqual([
      ["CENOMAR", "Bride"],
    ]);
  });

  it("matches an older attachment without a requirement id by its name", () => {
    const slots = addableUploads({
      ...base,
      attachments: [
        { requirementId: null, requirementName: "pre-marriage seminar certificate ", subjectRole: null },
      ],
    });
    expect(slots.some((slot) => slot.requirementId === SEMINAR.id)).toBe(false);
  });

  it("follows the request's answers for conditional documents", () => {
    const slots = addableUploads({
      ...base,
      formData: { ...formData, civil_status: "widowed" },
      attachments: [],
    });
    expect(slots.some((slot) => slot.requirementId === WIDOWED_ONLY.id)).toBe(true);
  });
});

describe("reading the people back out of form_data", () => {
  it("restores each party with its stored role", () => {
    expect(subjectsFromFormData(formData, []).map((s) => [s.role, s.lastName])).toEqual([
      ["Groom", "Cruz"],
      ["Bride", "Santos"],
    ]);
  });

  it("takes a lone subject's role from the service, as the wizard assigned it", () => {
    const single = flattenSubjects([
      { role: "Child", firstName: "Ana", middleName: "", lastName: "Reyes", suffix: "", sex: "female" },
    ]);
    expect(subjectsFromFormData(single, ["Child"])[0]).toMatchObject({
      role: "Child",
      firstName: "Ana",
      lastName: "Reyes",
    });
    expect(subjectsFromFormData(single, [])[0].role).toBe("Subject");
  });
});
