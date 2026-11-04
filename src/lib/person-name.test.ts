import { describe, expect, it } from "vitest";
import { INVALID_PERSON_NAME, validatePersonName } from "./person-name";
import { validateTemplateAnswers } from "../features/forms/form-template.utils";
import type { FormTemplateDefinition } from "../features/forms/form-template.types";

describe("service name validation", () => {
  it.each(["123456", "@@@", "123-!", "１２３"])("rejects %s", (name) => {
    expect(validatePersonName(name)).toBe(INVALID_PERSON_NAME);
  });

  it.each(["", " ", "Juan", "Muñoz", "O'Connor", "Anne-Marie", "李", "Juan 2"])(
    "allows %s without changing required-field rules", (name) => {
      expect(validatePersonName(name)).toBe(true);
    },
  );

  const definition = {
    schemaVersion: 1,
    sections: [{ key: "details", step: "details", title: "Details", fields: [
      { key: "subjects", type: "person_group", label: "Names", required: true },
      { key: "requester_first_name", type: "text", label: "First name", required: false },
      { key: "mother_maiden_name", type: "text", label: "Mother's maiden name", required: false },
    ] }],
  } as FormTemplateDefinition;
  const subject = { role: "Owner", firstName: "Juan", middleName: "", lastName: "Cruz", suffix: "", sex: "male" };

  it.each(["firstName", "middleName", "lastName"])("checks submitted subject %s", (key) => {
    expect(validateTemplateAnswers(definition, { subjects: [{ ...subject, [key]: "123!" }] }).success).toBe(false);
  });

  it.each(["requester_first_name", "mother_maiden_name"])("checks submitted %s", (key) => {
    expect(validateTemplateAnswers(definition, { subjects: [subject], [key]: "123!" }).success).toBe(false);
  });

  it("allows an omitted optional middle name", () => {
    expect(validateTemplateAnswers(definition, { subjects: [subject] }).success).toBe(true);
  });
});
