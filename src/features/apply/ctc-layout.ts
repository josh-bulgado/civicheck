import type { FormTemplateDefinition } from "~/features/forms/form-template.types";

export function isCtcService(serviceCode: string) {
  return serviceCode === "CTC_ISSUANCE" || serviceCode.startsWith("CTC-");
}

export function ctcDetailsLayout(definition: FormTemplateDefinition, isCtc: boolean, recordType?: unknown) {
  if (!isCtc) return definition;
  return {
    ...definition,
    sections: definition.sections.map((section) => {
      if (recordType === "marriage" && section.fields.some((field) => field.type === "person_group")) {
        section = { ...section, title: "Husband's Name" };
      }
      if (!section.fields.some((field) => field.key === "father_name")) return section;
      const timingKeys = ["registered_late", "registered_late_when"];
      const timingFields = section.fields.filter((field) => timingKeys.includes(field.key));
      const fields = section.fields.filter((field) => !timingKeys.includes(field.key));
      const fatherIndex = fields.findIndex((field) => field.key === "father_name");
      fields.splice(fatherIndex + 1, 0, ...timingFields);
      return { ...section, fields };
    }).sort((a, b) =>
      Number(b.step === "details" && b.fields.some((field) => field.type === "person_group")) -
      Number(a.step === "details" && a.fields.some((field) => field.type === "person_group"))),
  };
}
