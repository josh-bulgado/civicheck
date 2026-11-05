import { describe, expect, it } from "vitest";
import { selectableFieldOptions, validateTemplateAnswers } from "./form-template.utils";
import type { FormFieldDefinition, FormTemplateDefinition } from "./form-template.types";

const relationship: FormFieldDefinition = {
  key: "requester_relationship", type: "select", label: "Relationship", required: true,
  options: [{ value: "owner", label: "I am the document owner" }, { value: "spouse", label: "Spouse" }],
};
const definition: FormTemplateDefinition = {
  schemaVersion: 1,
  sections: [{ key: "details", title: "Details", step: "details", fields: [
    { key: "record_type", type: "select", label: "Record type", required: true,
      options: ["birth", "marriage", "death"].map((value) => ({ value, label: value })) },
    relationship,
  ] }],
};

describe("CTC requester relationship", () => {
  it("hides owner for death and rejects it during submission", () => {
    expect(selectableFieldOptions(relationship, { record_type: "death" }).map((option) => option.value)).toEqual(["spouse"]);
    expect(validateTemplateAnswers(definition, { record_type: "death", requester_relationship: "owner" }).success).toBe(false);
    expect(validateTemplateAnswers(definition, { record_type: "death", requester_relationship: "spouse" }).success).toBe(true);
  });
  it("keeps owner available for birth and marriage", () => {
    for (const record_type of ["birth", "marriage"]) {
      expect(selectableFieldOptions(relationship, { record_type })).toEqual(relationship.options);
      expect(validateTemplateAnswers(definition, { record_type, requester_relationship: "owner" }).success).toBe(true);
    }
  });
});
