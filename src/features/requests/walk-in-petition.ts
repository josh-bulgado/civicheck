import type { FormTemplateDefinition, FormFieldDefinition, TemplateAnswers } from "~/features/forms/form-template.types";
import { prepareWalkInBirth } from "./walk-in-birth";

export function isWalkInPetition(serviceCode: string) {
  return serviceCode === "RA9048-CFN" || serviceCode === "RA9048-CCE";
}

export function petitionCaseForService(definition: FormTemplateDefinition, serviceCode: string) {
  const clerical = serviceCode === "RA9048-CCE";
  const answers: Record<string, string> = clerical ? {
    change_first_name: "no", correct_sex: "no", correct_birth_day_month: "no", correct_other: "yes",
  } : {};
  const kept = new Set([
    "current_first_name", "new_first_name", "employment_status", "corrected_birth_date",
    "record_type", "other_entry", "other_current", "other_correct", "event_date", "event_place",
    "reference_number", "additional_notes", "subjects", "contact_number",
  ]);
  // Clerical intake is already identified by the service. The other variant
  // needs the scope to show its fields and checklist, including combined cases.
  const scopeFields: FormFieldDefinition[] = clerical ? [] : (definition.caseSelector?.questions ?? []).map(question => ({
    key: question.key, type: "select", label: ({
      change_first_name: "Change of first name", correct_sex: "Correction of sex",
      correct_birth_day_month: "Correction of birth day or month", correct_other: "Other clerical correction",
    } as Record<string, string>)[question.key] ?? question.label,
    required: true, options: question.options.map(option => ({ value: option.value, label: option.label })),
  }));
  return {
    answers,
    definition: {
      ...definition,
      sections: definition.sections.map(section => ({
        ...section,
        fields: [
          ...(section.step === "case" ? scopeFields : []),
          ...section.fields.filter(field => kept.has(field.key) && (clerical || field.key !== "record_type")).map(field => {
            if (field.key === "record_type") return { ...field, visibleWhen: undefined };
            if (field.key === "reference_number") return { ...field, label: "Registry number (if available)" };
            if (field.key === "new_first_name") return { ...field, label: "Proposed first name" };
            if (field.key === "employment_status") return {
              ...field, label: "Petitioner's employment status",
              options: [{ value: "employed", label: "Employed" }, { value: "not_employed", label: "Not employed / self-employed" }],
            };
            return field;
          }),
          ...(section.step === "case" ? [
            { key: "corrected_sex", type: "select" as const, label: "Correct sex", required: true,
              options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }],
              visibleWhen: { field: "correct_sex", operator: "equals" as const, value: "yes" } },
            { key: "petitioner_name", type: "text" as const, label: "Petitioner's full name (if different from the record owner)", required: false },
          ] : []),
        ],
      })),
    },
  };
}

export function prepareWalkInPetition(definition: FormTemplateDefinition, answers: TemplateAnswers, roles: string[]) {
  const prepared = prepareWalkInBirth(definition, answers, roles);
  if (prepared.error) return prepared;
  if (prepared.serviceCode === "RA9048-CFN") prepared.formData.record_type = "birth";
  const { event_date: recorded, corrected_birth_date: corrected } = prepared.formData;
  if (corrected && recorded && corrected.slice(0, 4) !== recorded.slice(0, 4)) {
    return { error: true as const, message: "Only the birth day or month can be corrected. The year must match the record." };
  }
  return prepared;
}
