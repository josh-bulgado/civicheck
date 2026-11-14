import type { FormTemplateDefinition, FormFieldDefinition, TemplateAnswers } from "~/features/forms/form-template.types";
import { prepareWalkInBirth } from "./walk-in-birth";
import { PETITION_OPTIONS, petitionRecordType, withPrimaryPetition } from "~/features/services/petition-selection";

export function isWalkInPetition(serviceCode: string) {
  return serviceCode === "RA9048-CFN" || serviceCode === "RA9048-CCE";
}

export function petitionWalkInAnswers(answers: TemplateAnswers, serviceCode: string): TemplateAnswers {
  const primary = serviceCode === "RA9048-CCE" ? "correct_other" : answers.primary_petition;
  if (!PETITION_OPTIONS.some(option => option.value === primary)) return answers;
  const selected = { ...answers, ...withPrimaryPetition({}, String(primary)) };
  return { ...selected, record_type: petitionRecordType(selected) };
}

export function petitionCaseForService(definition: FormTemplateDefinition, serviceCode: string) {
  const clerical = serviceCode === "RA9048-CCE";
  const answers = clerical ? withPrimaryPetition({}, "correct_other") : {};
  const kept = new Set([
    "new_first_name", "employment_status", "corrected_birth_date",
    "record_type", "other_entry", "other_current", "other_correct", "event_date", "event_place",
    "reference_number", "subjects", "mother_first_name", "mother_middle_name", "mother_last_name",
    "father_name", "wife_first_name", "wife_middle_name", "wife_last_name", "registered_late", "registered_late_when",
  ]);
  const primaryField: FormFieldDefinition = {
    key: "primary_petition", type: "select", label: "Petition type", required: true,
    options: PETITION_OPTIONS.filter(option => clerical ? option.value === "correct_other" : option.value !== "correct_other"),
  };
  return {
    answers,
    definition: {
      ...definition,
      sections: definition.sections.map(section => ({
        ...section,
        fields: [
          ...(section.step === "case" ? [primaryField] : []),
          ...section.fields.filter(field => kept.has(field.key) && (clerical || field.key !== "record_type")).map(field => {
            field = { ...field, helpText: undefined };
            if (clerical && ["mother_first_name", "mother_middle_name", "mother_last_name", "father_name"].includes(field.key)) {
              return { ...field, visibleWhen: { field: "record_type", operator: "equals" as const, value: "birth" } };
            }
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
          ] : []),
        ].sort((a, b) => section.step === "case" ? Number(b.required) - Number(a.required) : 0),
      })),
    },
  };
}

export function prepareWalkInPetition(definition: FormTemplateDefinition, answers: TemplateAnswers, roles: string[]) {
  const primary = answers.primary_petition;
  if (!PETITION_OPTIONS.some(option => option.value === primary)) return { error: true as const, message: "Choose the petition type." };
  const normalized = petitionWalkInAnswers(answers, primary === "correct_other" ? "RA9048-CCE" : "RA9048-CFN");
  if (normalized.record_type === "marriage" && Array.isArray(normalized.subjects)) {
    normalized.subjects = normalized.subjects.map(person => ({ ...person, sex: "male" }));
  }
  const prepared = prepareWalkInBirth(definition, normalized, roles);
  if (prepared.error) return prepared;
  if (prepared.serviceCode === "RA9048-CFN") prepared.formData.record_type = "birth";
  const { event_date: recorded, corrected_birth_date: corrected } = prepared.formData;
  if (corrected && recorded && corrected.slice(0, 4) !== recorded.slice(0, 4)) {
    return { error: true as const, message: "Only the birth day or month can be corrected. The year must match the record." };
  }
  return prepared;
}
