import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import { todayKeyInTimeZone } from "~/features/forms/form-template.utils";
import { ageInYears, fromDateKey } from "~/lib/date";

export function surnameChangeCaseDefinition(definition: FormTemplateDefinition, serviceCode: string) {
  if (serviceCode !== "RA9255_SURNAME") return definition;
  return {
    ...definition,
    sections: definition.sections.map(section => section.step !== "case" ? section : {
      ...section,
      description: undefined,
      fields: section.fields.map(field => ({
        ...field,
        helpText: undefined,
        ...(field.key === "reference_number" ? { label: "Registry Number" } : {}),
      })),
    }),
  };
}

export function surnameChangeRequirementName(
  name: string,
  serviceCode: string | null | undefined,
  birthDate: unknown,
  today = todayKeyInTimeZone(),
) {
  if (serviceCode !== "RA9255_SURNAME" || !/Subscribed Affidavit to Use the Surname of the Father/i.test(name)) return name;
  const document = name.replace(/,\s*with personal appearance[\s\S]*$/i, "");
  if (typeof birthDate !== "string" || !fromDateKey(birthDate) || birthDate > today) {
    return `${document}, personal appearance and signing requirements depend on the child's age`;
  }
  const age = ageInYears(birthDate, today);
  if (age < 7) return `${document}, with personal appearance of the mother or legal guardian`;
  // The supplied Charter includes age 7 in both signing ranges.
  if (age === 7) return `${document}, CCRO must verify the signing and personal appearance requirements for age 7`;
  if (age < 18) return `${document}, with the child's personal appearance and notarized attestation of the mother or legal guardian`;
  return `${document}, signed by the child with their personal appearance`;
}
