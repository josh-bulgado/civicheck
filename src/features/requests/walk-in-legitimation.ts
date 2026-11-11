import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import { birthCaseForService } from "./walk-in-birth";

export function walkInCaseForService(definition: FormTemplateDefinition, serviceCode: string) {
  if (serviceCode === "SUPPLEMENTAL_REPORT") {
    // The sworn affidavit already explains why the entry was omitted.
    const keys = ["record_type", "event_date", "event_place", "reference_number",
      "entry_to_supplement", "information_to_add", "subjects", "contact_number"];
    return {
      answers: {} as Record<string, string>,
      definition: {
        ...definition,
        sections: definition.sections.map((section) => ({
          ...section,
          fields: section.fields.filter((field) => keys.includes(field.key)),
        })),
      },
    };
  }
  if (serviceCode !== "LEGITIMATION") return birthCaseForService(definition, serviceCode);

  // Staff check eligibility from the papers; only the COLB answer changes the checklist.
  return {
    answers: {} as Record<string, string>,
    definition: {
      ...definition,
      sections: definition.sections.map((section) => ({
        ...section,
        fields: section.fields
          .filter((field) => !["free_to_marry", "filer_relationship", "purpose", "purpose_other"].includes(field.key))
          .map((field) => {
            if (field.key === "marriage_place") return { ...field, required: false };
            if (field.key === "father_on_record") return {
              ...field,
              options: field.options?.filter((option) => option.value !== "not_sure"),
            };
            return field;
          }),
      })),
    },
  };
}
