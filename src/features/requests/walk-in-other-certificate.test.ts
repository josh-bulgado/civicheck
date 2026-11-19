import { expect, it } from "vitest";
import fixture from "./fixtures/other-certificate-walk-in-form.json";
import { parseFormTemplateDefinition, fieldsForStep, isFieldVisible } from "~/features/forms/form-template.utils";
import { walkInCaseForService } from "./walk-in-legitimation";
import { prepareWalkInSupplemental } from "./walk-in-supplemental";
import { emptySubject } from "~/lib/subject-fields";

it("adds mother maiden-name fields to Other Certificates walk-ins even with an older saved form", () => {
  const original = parseFormTemplateDefinition(fixture);
  const stale = { ...original, sections: original.sections.map(section => ({
    ...section, fields: section.fields.filter(field => !field.key.startsWith("mother_")),
  })) };
  const { definition } = walkInCaseForService(stale, "OTHER_CERT");
  const motherKeys = ["mother_first_name", "mother_middle_name", "mother_last_name"];
  const keys = fieldsForStep(definition, "details").map(field => field.key);
  expect(keys.indexOf("event_date")).toBeLessThan(keys.indexOf("mother_first_name"));
  expect(keys.indexOf("event_place")).toBeLessThan(keys.indexOf("mother_first_name"));
  expect(keys.indexOf("father_name")).toBe(keys.indexOf("mother_last_name") + 1);
  expect(fieldsForStep(definition, "details").find(field => field.key === "father_name")?.required).toBe(false);
  expect(fieldsForStep(definition, "details").filter(field => isFieldVisible(field, { record_type: "birth" }))
    .filter(field => field.key.startsWith("mother_")).map(field => field.key)).toEqual(motherKeys);
  for (const record_type of ["death", "marriage"]) {
    expect(fieldsForStep(definition, "details").filter(field => isFieldVisible(field, { record_type }))
      .some(field => field.key.startsWith("mother_"))).toBe(false);
  }
  const answers = { record_type: "birth", subjects: [{ ...emptySubject("Subject"), firstName: "Ana", middleName: "Santos", lastName: "Cruz" }],
    purpose: "Employment", event_date: "2000-01-01", event_place: "Legazpi City", registered_late: "no",
    mother_first_name: "Maria", mother_middle_name: "N/A", mother_last_name: "Santos" };
  const result = prepareWalkInSupplemental(definition, answers, ["Subject"]);
  expect(result.error).toBe(false);
  if (!result.error) expect(result.formData).toMatchObject({ mother_first_name: "Maria", mother_middle_name: "N/A", mother_last_name: "Santos" });
  const withFather = prepareWalkInSupplemental(definition, { ...answers, father_name: "Juan Cruz" }, ["Subject"]);
  expect(withFather.error).toBe(false);
  if (!withFather.error) expect(withFather.formData.father_name).toBe("Juan Cruz");
  for (const key of motherKeys) expect(prepareWalkInSupplemental(definition, { ...answers, [key]: "" }, ["Subject"]).error).toBe(true);
  expect(walkInCaseForService(definition, "OTHER_CERT").definition).toEqual(definition);
});
