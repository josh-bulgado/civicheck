import { expect, it } from "vitest";
import { birthRequesterRelationship } from "./birth-requester-relationship";
import { fieldsForStep, validateTemplateAnswers, flattenTemplateAnswers } from "~/features/forms/form-template.utils";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";

const original: FormTemplateDefinition = { schemaVersion: 1, sections: [{ key: "details", title: "Details", step: "details", fields: [
  { key: "subjects", type: "person_group", label: "People", required: true },
  { key: "father_name", type: "text", label: "Father", required: false },
] }] };

it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL"])("places required requester fields after the father for %s", (code) => {
  const definition = birthRequesterRelationship(original, code);
  expect(fieldsForStep(definition, "details").map((field) => field.key)).toEqual(["subjects", "father_name", "requester_relationship", "requester_relationship_other"]);
  expect(fieldsForStep(definition, "details").find((field) => field.key === "requester_relationship")?.options).toHaveLength(8);
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
  expect(birthRequesterRelationship(original, "BIRTH_DELAYED")).toBe(original);
});
