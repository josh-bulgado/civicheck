import type {
  FormTemplateDefinition,
  TemplateAnswers,
} from "~/features/forms/form-template.types";
import {
  canonicalizeTemplateAnswers,
  flattenTemplateAnswers,
  resolveCaseSelectorServiceCode,
  validateTemplateAnswers,
} from "~/features/forms/form-template.utils";
import { reconcileSubjects, type SubjectFields } from "~/lib/subject-fields";

export function isWalkInBirth(serviceCode: string) {
  return (
    /^(OTCOLB-|DCOLB-)/.test(serviceCode) ||
    ["BIRTH_ONTIME", "BIRTH_DELAYED"].includes(serviceCode)
  );
}

export function birthCaseForService(definition: FormTemplateDefinition, serviceCode: string) {
  const selector = definition.caseSelector;
  const outcome = selector?.outcomes.find((item) => item.serviceCode === serviceCode);
  if (!selector || !outcome) return { definition, answers: {} as Record<string, string> };

  const answers = Object.fromEntries(outcome.when.conditions
    .filter((condition) => condition.operator === "equals")
    .map((condition) => [condition.field, condition.value]));
  const maritalQuestion = selector.questions.find((question) => question.key === "marital");
  const needsMarital = !answers.marital && maritalQuestion && definition.sections.some((section) =>
    section.fields.some((field) => field.key === "father_last_name"),
  );
  return {
    definition: {
      ...definition,
      sections: needsMarital ? definition.sections.map((section) => section.step === "case" ? {
        ...section,
        fields: [...section.fields, { key: "marital", type: "select" as const, label: maritalQuestion.label, required: true, options: maritalQuestion.options }],
      } : section) : definition.sections,
      caseSelector: {
        ...selector,
        questions: selector.questions.filter((question) => question.key in answers),
      },
    },
    answers,
  };
}

export function prepareWalkInBirth(
  definition: FormTemplateDefinition,
  answers: TemplateAnswers,
  roles: string[],
) {
  const people = definition.sections
    .flatMap((section) => section.fields)
    .filter((field) => field.type === "person_group");
  const normalized = { ...answers };
  for (const field of people) {
    const rows = answers[field.key];
    if (
      !Array.isArray(rows) ||
      rows.length !== roles.length ||
      rows.some(
        (row) =>
          !row ||
          [
            row.firstName,
            row.middleName,
            row.lastName,
            row.suffix,
            row.sex,
          ].some((value) => typeof value !== "string"),
      )
    ) {
      return { error: true as const, message: "Enter each person's details." };
    }
    const subjects = reconcileSubjects(rows as SubjectFields[], roles);
    if (
      subjects.some(
        (subject) => !subject.middleName.trim() && !subject.noMiddleName,
      )
    ) {
      return {
        error: true as const,
        message: "Enter each person's middle name or select No middle name.",
      };
    }
    normalized[field.key] = subjects;
  }
  const canonical = canonicalizeTemplateAnswers(definition, normalized);
  const validation = validateTemplateAnswers(definition, canonical);
  if (!validation.success)
    return { error: true as const, message: validation.message };
  return {
    error: false as const,
    serviceCode: resolveCaseSelectorServiceCode(definition, canonical),
    formData: flattenTemplateAnswers(definition, canonical),
    subjects: people.flatMap(
      (field) => canonical[field.key] as SubjectFields[],
    ),
  };
}
