import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import { birthCaseForService } from "./walk-in-birth";
import { isWalkInPetition, petitionCaseForService } from "./walk-in-petition";

export function walkInCaseForService(definition: FormTemplateDefinition, serviceCode: string) {
  if (isWalkInPetition(serviceCode)) return petitionCaseForService(definition, serviceCode);
  const surnameChange = serviceCode === "RA9255_SURNAME";
  if (serviceCode !== "LEGITIMATION" && !surnameChange) return birthCaseForService(definition, serviceCode);

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
            if (surnameChange && field.key === "event_place") return {
              ...field, label: "Child's place of birth (as recorded)",
            };
            if (field.key === "marriage_place") return { ...field, required: false };
            if (field.key === "father_on_record") return {
              ...field,
              options: field.options?.filter((option) => option.value !== "not_sure"),
              ...(surnameChange ? {
                helpText: "Check the child's COLB. If the father did not acknowledge the child, check the notarized Father's Admission of Paternity (3 original copies).",
              } : {}),
            };
            return field;
          }),
      })),
    },
  };
}
