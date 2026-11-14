import { expect, it } from "vitest";
import { birthRequesterRelationship } from "./birth-requester-relationship";
import { fieldsForStep, validateTemplateAnswers, flattenTemplateAnswers } from "~/features/forms/form-template.utils";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";

const original: FormTemplateDefinition = { schemaVersion: 1, sections: [{ key: "details", title: "Details", step: "details", fields: [
  { key: "subjects", type: "person_group", label: "People", required: true },
  { key: "father_name", type: "text", label: "Father", required: false },
] }] };

it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL"])("places required requester fields on the case page for %s", (code) => {
  const definition = birthRequesterRelationship(original, code);
  expect(fieldsForStep(definition, "details").map((field) => field.key)).toEqual(["subjects", "father_name"]);
  expect(fieldsForStep(definition, "case").map((field) => field.key)).toEqual(["requester_relationship", "requester_relationship_other"]);
  expect(fieldsForStep(definition, "case").find((field) => field.key === "requester_relationship")?.options).toHaveLength(8);
  const relationshipOnly = { ...definition, sections: definition.sections.map((section) => ({ ...section, fields: section.fields.filter((field) => field.key.startsWith("requester_")) })) };
  expect(validateTemplateAnswers(relationshipOnly, {}).success).toBe(false);
  expect(validateTemplateAnswers(relationshipOnly, { requester_relationship: "mother" }).success).toBe(true);
  expect(validateTemplateAnswers(relationshipOnly, { requester_relationship: "other" }).success).toBe(false);
  const answers = { requester_relationship: "other", requester_relationship_other: "Family friend" };
  expect(validateTemplateAnswers(relationshipOnly, answers).success).toBe(true);
  expect(flattenTemplateAnswers(relationshipOnly, answers)).toMatchObject(answers);
  expect(flattenTemplateAnswers(relationshipOnly, { ...answers, requester_relationship: "father" })).not.toHaveProperty("requester_relationship_other");
  expect(birthRequesterRelationship(definition, code)).toEqual(definition);
});

it("does not change other services", () => {
  expect(birthRequesterRelationship(original, "MARRIAGE_LICENSE")).toBe(original);
});

it.each(["BIRTH_DELAYED", "DCOLB-0079-BRAP", "DCOLB-80UP-BRAP", "DCOLB-0079-NORMAL-MARITAL", "DCOLB-0079-NORMAL-NONMARITAL", "DCOLB-80UP-NORMAL-MARITAL", "DCOLB-80UP-NORMAL-NONMARITAL"])("replaces informant inputs with requester role for %s", (code) => {
  const source = { ...original, sections: [{ key: "case", title: "Case", step: "case" as const, fields: [
    { key: "informant_name", type: "text" as const, label: "Informant", required: false },
    { key: "informant_relationship", type: "text" as const, label: "Relationship", required: false },
  ] }, ...original.sections] };
  const definition = birthRequesterRelationship(source, code);
  expect(fieldsForStep(definition, "case").map((field) => field.key)).toEqual(["requester_relationship", "requester_relationship_other"]);
  expect(fieldsForStep(definition, "details").some((field) => field.key.startsWith("requester_relationship"))).toBe(false);
  const relationship = fieldsForStep(definition, "case").find((field) => field.key === "requester_relationship")!;
  expect(relationship.options?.map((option) => option.value)).toEqual(expect.arrayContaining(["self", "informant", "other"]));
  const onlyRelationship = { ...definition, sections: definition.sections.map((section) => ({ ...section,
    fields: section.fields.filter((field) => field.key.startsWith("requester_")),
  })) };
  for (const requester_relationship of ["self", "informant"]) {
    expect(validateTemplateAnswers(onlyRelationship, { requester_relationship }).success).toBe(true);
    expect(flattenTemplateAnswers(onlyRelationship, { requester_relationship, informant_name: "Old draft" }))
      .toEqual({ requester_relationship });
  }
  expect(validateTemplateAnswers(onlyRelationship, {}).success).toBe(false);
  expect(validateTemplateAnswers(onlyRelationship, { requester_relationship: "other" }).success).toBe(false);
  expect(birthRequesterRelationship(definition, code)).toEqual(definition);
});
