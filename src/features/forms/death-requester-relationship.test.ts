import { describe, expect, it } from "vitest";
import { deathRequesterRelationship } from "./death-requester-relationship";
import { canonicalizeTemplateAnswers, validateTemplateAnswers } from "./form-template.utils";
import type { FormTemplateDefinition } from "./form-template.types";

const source: FormTemplateDefinition = {
  schemaVersion: 1,
  sections: [{ key: "case", step: "case", title: "Case details", fields: [
    { key: "additional_notes", type: "textarea", label: "Additional notes", required: false },
  ] }],
};

describe("on-time death requester relationship", () => {
  const definition = deathRequesterRelationship(source, "DEATH_ONTIME");

  it("places the optional relationship before notes and preserves other services", () => {
    expect(definition.sections[0].fields.map((field) => field.key)).toEqual([
      "requester_relationship", "requester_relationship_other", "additional_notes",
    ]);
    expect(deathRequesterRelationship(definition, "DEATH_ONTIME")).toEqual(definition);
    expect(deathRequesterRelationship(source, "DEATH_DELAYED")).toBe(source);
    expect(validateTemplateAnswers(definition, {})).toEqual({ success: true });
  });

  it("requires a description for Other and drops stale hidden descriptions", () => {
    expect(validateTemplateAnswers(definition, { requester_relationship: "other" }).success).toBe(false);
    expect(validateTemplateAnswers(definition, {
      requester_relationship: "other", requester_relationship_other: "Neighbor",
    })).toEqual({ success: true });
    const answers = canonicalizeTemplateAnswers(definition, {
      requester_relationship: "informant", requester_relationship_other: "Neighbor",
    });
    expect(answers.requester_relationship).toBe("informant");
    expect(answers.requester_relationship_other).toBeUndefined();
  });
});
