import type { FormFieldDefinition, FormTemplateDefinition } from "~/features/forms/form-template.types";
import { isOnTimeBirth } from "./on-time-birth-layout";

export function birthRequesterRelationship(definition: FormTemplateDefinition, serviceCode: string): FormTemplateDefinition {
  const delayed = serviceCode === "BIRTH_DELAYED" || serviceCode.startsWith("DCOLB-");
  if (!isOnTimeBirth(serviceCode) && !delayed) return definition;
  const fields: FormFieldDefinition[] = [
    {
      key: "requester_relationship", type: "select", label: delayed ? "Requester's relationship to the registrant" : "Requester's relationship to the child", required: true,
      options: [
        ...(delayed ? [{ value: "self", label: "I am the person being registered" }] : []),
        { value: "mother", label: "Mother" },
        { value: "father", label: "Father" },
        { value: "legal_guardian", label: "Legal guardian" },
        { value: "grandparent", label: "Grandparent" },
        { value: "other_relative", label: "Other relative" },
        { value: "birth_attendant", label: "Birth attendant" },
        { value: "hospital_representative", label: "Hospital/clinic representative" },
        ...(delayed ? [{ value: "informant", label: "Informant (person reporting the birth)" }] : []),
        { value: "other", label: "Other — please specify" },
      ],
    },
    {
      key: "requester_relationship_other", type: "text", label: "Please specify", required: true,
      visibleWhen: { field: "requester_relationship", operator: "equals", value: "other" },
    },
  ];
  const sections = definition.sections.map((section) => ({
    ...section,
    fields: section.fields.filter((field) =>
      field.key !== "place_type" &&
      !fields.some((item) => item.key === field.key) &&
      !(delayed && ["informant_name", "informant_relationship"].includes(field.key)),
    ),
  }));
  const caseIndex = sections.findIndex((section) => section.step === "case");
  if (caseIndex < 0) {
    sections.unshift({ key: "case", title: "Request details", step: "case", fields });
  } else {
    const section = sections[caseIndex];
    section.fields = [
      ...section.fields.filter((field) => field.required),
      ...fields,
      ...section.fields.filter((field) => !field.required),
    ];
  }
  return { ...definition, sections };
}
