import { describe, expect, it } from "vitest";
import { formatFieldAnswer } from "./answer-format";
import { canonicalizeTemplateAnswers, validateTemplateAnswers } from "./form-template.utils";
import { formTemplateDefinitionSchema } from "./form-template.types";

const definition = formTemplateDefinitionSchema.parse({
  schemaVersion: 1,
  sections: [{ key: "details", step: "details", title: "Details", fields: [
    { key: "registered_late", type: "select", label: "Registered Late?", required: true,
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
    { key: "registered_late_when", type: "date", label: "Registration date", required: true,
      allowEstimate: true, dateDirection: "past",
      visibleWhen: { field: "registered_late", operator: "equals", value: "yes" } },
    { key: "subjects", type: "person_group", label: "Owner", required: false },
  ] }],
});

describe("late registration dates", () => {
  it.each(["2018-01-02", "Estimated: 2018", "Estimated: 2015–2020", "Estimated: 2015-2020"])("accepts %s", (value) => {
    expect(validateTemplateAnswers(definition, { registered_late: "yes", registered_late_when: value }, "2026-11-01")).toEqual({ success: true });
  });

  it.each(["", "Registration date unknown", "Estimated: ", "Estimated:    ", "Estimated: 2027", "Estimated: 2020-2015", "Estimated: 0000", "Estimated: sometime", "2027-01-01"])("rejects %s", (value) => {
    expect(validateTemplateAnswers(definition, { registered_late: "yes", registered_late_when: value }, "2026-11-01").success).toBe(false);
  });

  it("removes the previous date when late registration changes to No", () => {
    const answers = canonicalizeTemplateAnswers(definition, { registered_late: "no", registered_late_when: "Estimated: 2015-2020" });
    expect(answers.registered_late_when).toBeUndefined();
    expect(validateTemplateAnswers(definition, answers).success).toBe(true);
  });

  it("keeps estimates clearly labelled on review", () => {
    expect(formatFieldAnswer(definition.sections[0].fields[1], "Estimated: 2018")).toBe("Estimated: 2018");
  });

  it("rejects estimates in templates that only accept exact dates", () => {
    const exactOnly = structuredClone(definition);
    exactOnly.sections[0].fields[1].allowEstimate = false;
    expect(validateTemplateAnswers(exactOnly, { registered_late: "yes", registered_late_when: "Estimated: 2018" }).success).toBe(false);
  });
});
