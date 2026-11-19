import type { CaseSelectorDefinition, FormTemplateDefinition, TemplateAnswers } from "~/features/forms/form-template.types";

export const PETITION_OPTIONS = [
  { value: "change_first_name", label: "Change of first name" },
  { value: "correct_other", label: "Clerical or typographical error" },
  { value: "correct_sex", label: "Sex recorded on the birth certificate" },
  { value: "correct_birth_day_month", label: "Day or month of birth" },
];
export const PETITION_SELECTION_FIELDS = ["primary_petition"];

export function isPetitionService(code: string) {
  return code === "RA9048-CFN" || code === "RA9048-CCE";
}

export function petitionRecordType(answers: Record<string, unknown>): string {
  return answers.primary_petition === "correct_other" ? String(answers.record_type ?? "") : "birth";
}

export function petitionDetailsLayout(definition: FormTemplateDefinition, code: string, answers: Record<string, unknown>): FormTemplateDefinition {
  if (!isPetitionService(code)) return definition;
  const record = petitionRecordType(answers);
  const event = ({ birth: "Birth", marriage: "Marriage", death: "Death" } as Record<string, string>)[record];
  return {
    ...definition,
    sections: definition.sections.map(section => ({
      ...section,
      fields: section.fields.filter(field => record === "marriage" || !field.key.startsWith("wife_"))
        .map(field => event && (field.key === "event_date" || field.key === "event_place")
          ? { ...field, label: `${field.key === "event_date" ? "Date" : "Place"} of ${event}`, labelByAnswer: undefined }
          : field),
    })),
  };
}

export function isPetitionSelector(definition: CaseSelectorDefinition) {
  return definition.questions.length === 4 && PETITION_OPTIONS.every(option =>
    definition.questions.some(question => question.key === option.value),
  ) && definition.outcomes.every(outcome => isPetitionService(outcome.serviceCode));
}

export function withPrimaryPetition(answers: Record<string, string>, primary: string): Record<string, string> {
  return {
    ...answers,
    primary_petition: primary,
    ...Object.fromEntries(PETITION_OPTIONS.map(option => [option.value, option.value === primary ? "yes" : "no"])),
  };
}

export function petitionSelectionError(answers: TemplateAnswers) {
  const primary = PETITION_OPTIONS.find(option => option.value === answers.primary_petition);
  if (!primary) return "Choose the main change or correction you need.";
  if (PETITION_OPTIONS.some(option => answers[option.value] !== (option === primary ? "yes" : "no"))) {
    return "Choose one petition type for this request.";
  }
  return null;
}

export function petitionCaseLayout(definition: FormTemplateDefinition, code: string): FormTemplateDefinition {
  if (!isPetitionService(code)) return definition;
  return {
    ...definition,
    sections: definition.sections.map(section => ({
      ...section,
      fields: section.fields.filter(field => !PETITION_SELECTION_FIELDS.includes(field.key))
        .map(field => ["corrected_birth_date", "event_date", "filing_fee_exemption", "reference_number", "employment_status"].includes(field.key)
          ? { ...field, helpText: undefined } : field)
        .sort((a, b) => Number(b.required) - Number(a.required)),
    })),
  };
}
