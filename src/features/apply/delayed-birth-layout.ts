import type { FormTemplateDefinition } from "~/features/forms/form-template.types";

export function delayedBirthLayout(definition: FormTemplateDefinition, serviceCode: string) {
  if (serviceCode !== "BIRTH_DELAYED" && !serviceCode.startsWith("DCOLB-")) return definition;
  const birthFields = definition.sections.filter((section) => section.step === "case")
    .flatMap((section) => section.fields)
    .filter((field) => ["event_date", "event_place"].includes(field.key))
    .map((field) => field.key === "event_date" ? { ...field, helpText: undefined } : field);
  return {
    ...definition,
    sections: definition.sections.map((section) => ({
      ...section,
      fields: section.step === "case"
        ? section.fields.filter((field) => !["event_date", "event_place"].includes(field.key))
        : section.step === "details" && section.fields.some((field) => field.type === "person_group")
          ? [...birthFields, ...section.fields] : section.fields,
    })),
  };
}
