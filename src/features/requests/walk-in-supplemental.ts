import type { FormTemplateDefinition, TemplateAnswers } from "~/features/forms/form-template.types";
import { validatePersonName, INVALID_PERSON_NAME } from "~/lib/person-name";
import { flattenSubjects, reconcileSubjects, type SubjectFields } from "~/lib/subject-fields";
import { prepareWalkInBirth } from "./walk-in-birth";

export function prepareWalkInSupplemental(definition: FormTemplateDefinition, answers: TemplateAnswers, roles: string[]) {
  const people = definition.sections.flatMap((section) => section.fields).find((field) => field.type === "person_group");
  const rows = people ? answers[people.key] : undefined;
  if (!Array.isArray(rows) || rows.length !== roles.length || rows.some((row) =>
    !row || [row.firstName, row.middleName, row.lastName, row.suffix].some((value) => typeof value !== "string"))) {
    return { error: true as const, message: "Enter the person's name as shown on the civil registry certificate." };
  }
  const subjects = reconcileSubjects(rows as SubjectFields[], roles).map((person) => ({ ...person, sex: "" }));
  for (const subject of subjects) {
    if (!subject.firstName.trim() || !subject.lastName.trim() || (!subject.middleName.trim() && !subject.noMiddleName)) {
      return { error: true as const, message: "Enter the full name or select No middle name." };
    }
    if ([subject.firstName, subject.middleName, subject.lastName, subject.suffix].some((part) =>
      part.length > 120 || validatePersonName(part) !== true)) {
      return { error: true as const, message: INVALID_PERSON_NAME };
    }
  }
  // Sex does not affect this service. Validate the remaining fields separately.
  const caseDefinition = {
    ...definition,
    sections: definition.sections.map((section) => ({ ...section, fields: section.fields.filter((field) => field.type !== "person_group") })),
  };
  const prepared = prepareWalkInBirth(caseDefinition, answers, roles);
  if (prepared.error) return prepared;
  return { ...prepared, subjects, formData: { ...prepared.formData, ...flattenSubjects(subjects) } };
}
