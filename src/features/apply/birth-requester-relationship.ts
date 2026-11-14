import type { FormFieldDefinition, FormTemplateDefinition } from "~/features/forms/form-template.types";
import { isOnTimeBirth } from "./on-time-birth-layout";

export function birthRequesterRelationship(definition: FormTemplateDefinition, serviceCode: string): FormTemplateDefinition {
  if (!isOnTimeBirth(serviceCode)) return definition;
  const fields: FormFieldDefinition[] = [
    {
      key: "requester_relationship", type: "select", label: "Requester's relationship to the child", required: true,
      options: [
        { value: "mother", label: "Mother" },
        { value: "father", label: "Father" },
        { value: "legal_guardian", label: "Legal guardian" },
        { value: "grandparent", label: "Grandparent" },
        { value: "other_relative", label: "Other relative" },
        { value: "birth_attendant", label: "Birth attendant" },
        { value: "hospital_representative", label: "Hospital/clinic representative" },
        { value: "other", label: "Other — please specify" },
      ],
    },
    {
      key: "requester_relationship_other", type: "text", label: "Please specify", required: true,
      visibleWhen: { field: "requester_relationship", operator: "equals", value: "other" },
    },
  ];
  return {
    ...definition,
    sections: definition.sections.map((section) => {
      if (section.step !== "details" || !section.fields.some((field) => field.type === "person_group")) return section;
      const existing = section.fields.filter((field) => !fields.some((item) => item.key === field.key));
      let fatherIndex = -1;
      existing.forEach((field, index) => {
        if (field.key.startsWith("father_")) fatherIndex = index;
      });
      const index = fatherIndex < 0 ? existing.length : fatherIndex + 1;
      return { ...section, fields: [...existing.slice(0, index), ...fields, ...existing.slice(index)] };
    }),
  };
}
