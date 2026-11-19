import type { FormTemplateDefinition } from "~/features/forms/form-template.types";

// Staff copy the checked application; no online identity or wedding-plan questions.
export function marriageLicenseWalkInDefinition(definition: FormTemplateDefinition): FormTemplateDefinition {
  const keys = [
    "bride_date_of_birth", "groom_date_of_birth",
    "bride_nationality", "groom_nationality",
    "bride_civil_status", "groom_civil_status",
    "subjects", "contact_number",
  ];
  return {
    ...definition,
    sections: definition.sections.map((section) => ({
      ...section,
      fields: section.fields.filter((field) => keys.includes(field.key))
        .map((field) => ({ ...field, helpText: undefined })),
    })).filter((section) => section.fields.length > 0),
    // Requirements depend on age when the couple applies, not a future wedding date.
    derivedAnswers: definition.derivedAnswers?.map((derived) => ({
      ...derived,
      referenceDateField: undefined,
      label: derived.key === "bride_age_bracket" ? "Bride's age at application"
        : derived.key === "groom_age_bracket" ? "Groom's age at application" : derived.label,
    })),
  };
}
