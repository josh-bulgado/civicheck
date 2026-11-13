import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import { todayKeyInTimeZone } from "~/features/forms/form-template.utils";
import { ageInYears, fromDateKey } from "~/lib/date";

export function surnameChangeCaseDefinition(definition: FormTemplateDefinition, serviceCode: string) {
  if (serviceCode !== "RA9255_SURNAME") return definition;
  const order = ["filer_relationship", "father_on_record", "reference_number", "additional_notes"];
  return {
    ...definition,
    sections: definition.sections.map(section => section.step !== "case" ? section : {
      ...section,
      description: undefined,
      fields: section.fields.map(field => ({
        ...field,
        helpText: undefined,
        ...(field.key === "reference_number" ? { label: "Registry Number" } : {}),
      })).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)),
    }),
  };
}

export function surnameChangeRequirementName(
  name: string,
  serviceCode: string | null | undefined,
  birthDate: unknown,
  today = todayKeyInTimeZone(),
) {
  if (serviceCode === "RA9255_SURNAME" && /Admission of Paternity/i.test(name)) {
    return name.replace(/^\[Father did not acknowledge the child\]\s*/i, "");
  }
  if (serviceCode !== "RA9255_SURNAME" || !/Subscribed Affidavit to Use the Surname of the Father/i.test(name)) return name;
  const document = name.replace(/,\s*(?:with personal appearance|with the child's personal appearance|signed by the child|Ages?\s+[^:]+:)[\s\S]*$/i, "");
  if (typeof birthDate !== "string" || !fromDateKey(birthDate) || birthDate > today) {
    return `${document}, personal appearance and signing requirements depend on the child's age`;
  }
  const age = ageInYears(birthDate, today);
  if (age < 7) return `${document}, Ages 0–6: Mother or legal guardian signs and personally appears.`;
  // The supplied Charter includes age 7 in both signing ranges.
  if (age === 7) return `${document}, Age 7: CCRO must verify who signs and personally appears.`;
  if (age < 18) return `${document}, Ages 8–17: The child signs and personally appears, with notarized attestation from the mother or legal guardian.`;
  return `${document}, Ages 18+: The child signs and personally appears.`;
}

export function surnameChangeRequirementDisplay(name: string, serviceCode: string | null | undefined) {
  const match = name.match(/, (Ages? [^:]+): (.+)$/);
  if (serviceCode !== "RA9255_SURNAME" || !name.startsWith("Subscribed Affidavit") || !match) {
    return { name, ageLabel: null, ageNote: null };
  }
  return { name: name.slice(0, match.index), ageLabel: match[1], ageNote: match[2] };
}
