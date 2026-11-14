import { describe, expect, it } from "vitest";
import { INVALID_PERSON_NAME, validateNameField, validatePersonName } from "./person-name";
import { validateTemplateAnswers } from "../features/forms/form-template.utils";
import type { FormTemplateDefinition } from "../features/forms/form-template.types";

describe("service name validation", () => {
  it.each(["123456", "@@@", "123-!", "１２３", "Juan 2", "O'Connor", "Anne-Marie", "Juan.", "Juan\tCruz", "Juan\nCruz"])("rejects %s", (name) => {
    expect(validatePersonName(name)).toBe(INVALID_PERSON_NAME);
  });

  it.each(["", " ", "Juan", "Muñoz", "Mun\u0303oz", "李", "Juan Miguel", "De la Cruz"])(
    "allows %s without changing required-field rules", (name) => {
      expect(validatePersonName(name)).toBe(true);
    },
  );

  const definition = {
    schemaVersion: 1,
    sections: [{ key: "details", step: "details", title: "Details", fields: [
      { key: "subjects", type: "person_group", label: "Names", required: true },
      { key: "requester_first_name", type: "text", label: "First name", required: false },
      { key: "requester_middle_name", type: "text", label: "Middle name", required: false, noneLabel: "No middle name" },
      { key: "mother_maiden_name", type: "text", label: "Mother's maiden name", required: false },
      { key: "father_name", type: "text", label: "Father's Full Name", required: false },
    ] }],
  } as FormTemplateDefinition;
  const subject = { role: "Owner", firstName: "Juan", middleName: "", lastName: "Cruz", suffix: "", sex: "male" };

  it.each(["Raven Angel Paraladop Jr.", "Juan S. Cruz Sr."])("accepts periods in father's full name: %s", name => {
    expect(validateNameField({ key: "father_name" }, name)).toBe(true);
    expect(validateNameField({ key: "father_full_name" }, name)).toBe(true);
    expect(validateTemplateAnswers(definition, { subjects: [subject], father_name: name }).success).toBe(true);
    expect(validateNameField({ key: "requester_first_name" }, name)).toBe(INVALID_PERSON_NAME);
  });

  it.each(["...", "Juan 2.", "Juan!"])("rejects invalid father's full names: %s", name => {
    expect(validateNameField({ key: "father_name" }, name)).not.toBe(true);
    expect(validateTemplateAnswers(definition, { subjects: [subject], father_name: name }).success).toBe(false);
  });

  it.each(["firstName", "middleName", "lastName"])("checks submitted subject %s", (key) => {
    expect(validateTemplateAnswers(definition, { subjects: [{ ...subject, [key]: "123!" }] }).success).toBe(false);
  });

  it.each(["requester_first_name", "mother_maiden_name"])("checks submitted %s", (key) => {
    expect(validateTemplateAnswers(definition, { subjects: [subject], [key]: "123!" }).success).toBe(false);
  });

  it("allows an omitted optional middle name", () => {
    expect(validateTemplateAnswers(definition, { subjects: [subject] }).success).toBe(true);
  });

  it("preserves the no-middle-name checkbox and suffix", () => {
    expect(validateTemplateAnswers(definition, {
      subjects: [{ ...subject, suffix: "Jr." }], requester_middle_name: "N/A",
    }).success).toBe(true);
  });

  it.each(["Juan 2", "Juan!", "Anne-Marie"])("rejects mixed characters in submitted names: %s", (name) => {
    expect(validateTemplateAnswers(definition, { subjects: [{ ...subject, firstName: name }] }).success).toBe(false);
    expect(validateTemplateAnswers(definition, { subjects: [subject], requester_first_name: name }).success).toBe(false);
  });
});
