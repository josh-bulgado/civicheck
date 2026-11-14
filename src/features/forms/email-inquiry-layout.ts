import type { FormTemplateDefinition } from "./form-template.types";

export function emailInquiryLayout(definition: FormTemplateDefinition, serviceCode: string): FormTemplateDefinition {
  if (serviceCode !== "EMAIL_INQUIRY") return definition;
  const recordKeys = ["event_date", "event_place"];
  const recordFields = definition.sections.flatMap((section) => section.fields)
    .filter((field) => recordKeys.includes(field.key))
    .sort((a, b) => recordKeys.indexOf(a.key) - recordKeys.indexOf(b.key))
    .map((field) => {
      const isDate = field.key === "event_date";
      return {
        ...field,
        ...(isDate ? { helpText: undefined } : {}),
        label: isDate ? "DoB" : "PoB",
        labelByAnswer: {
          field: "record_type",
          labels: isDate
            ? { birth: "DoB", death: "DoD", marriage: "DoM" }
            : { birth: "PoB", death: "PoD", marriage: "PoM" },
        },
      };
    });
  if (!definition.sections.some((section) => section.step === "details")) return definition;
  const ownerSection = definition.sections.find((section) =>
    section.step === "details" && section.fields.some((field) => field.type === "person_group"));
  let inserted = false;
  return {
    ...definition,
    sections: definition.sections.map((section) => {
      const fields = section.fields.filter((field) => !recordKeys.includes(field.key));
      if (section.step === "case") {
        const referenceIndex = fields.findIndex((field) => field.key === "reference_number");
        if (referenceIndex >= 0) {
          const [reference] = fields.splice(referenceIndex, 1);
          const notesIndex = fields.findIndex((field) => field.key === "additional_notes");
          fields.splice(notesIndex < 0 ? fields.length : notesIndex, 0, reference);
        }
      }
      if ((ownerSection ? section.key === ownerSection.key : section.step === "details") && !inserted) {
        fields.push(...recordFields);
        inserted = true;
      }
      return { ...section, fields };
    }).sort((a, b) => Number(b === ownerSection || b.key === ownerSection?.key) -
      Number(a === ownerSection || a.key === ownerSection?.key)),
  };
}
