import type { FormTemplateDefinition } from "~/features/forms/form-template.types";

export function isOnTimeBirth(serviceCode: string) {
  return serviceCode === "BIRTH_ONTIME" || serviceCode.startsWith("OTCOLB-");
}

export function onTimeBirthLayout(definition: FormTemplateDefinition, serviceCode: string): FormTemplateDefinition {
  if (!isOnTimeBirth(serviceCode)) return definition;
  const birthKeys = ["event_date", "event_place"];
  const fatherKeys = ["father_first_name", "father_middle_name", "father_last_name"];
  const sections = definition.sections.map((section) => {
    const fatherFields = section.fields.filter((field) => fatherKeys.includes(field.key))
      .sort((a, b) => fatherKeys.indexOf(a.key) - fatherKeys.indexOf(b.key));
    let fatherIndex = 0;
    return { ...section, fields: section.fields.map((field) => fatherKeys.includes(field.key) ? fatherFields[fatherIndex++] : field) };
  });
  const birthFields = definition.sections
    .filter((section) => section.step === "case")
    .flatMap((section) => section.fields)
    .filter((field) => birthKeys.includes(field.key))
    .map((field) => field.key === "event_date" ? { ...field, helpText: undefined } : field);
  return {
    ...definition,
    sections: sections.map((section) => ({
      ...section,
      fields: section.step === "case"
        ? section.fields.filter((field) => !birthKeys.includes(field.key))
        : section.step === "details" && section.fields.some((field) => field.type === "person_group")
          ? [...birthFields, ...section.fields] : section.fields,
    })),
  };
}
