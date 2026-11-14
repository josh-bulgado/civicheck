import type { FormFieldDefinition, FormTemplateDefinition } from "./form-template.types";

export function deathRequesterRelationship(definition: FormTemplateDefinition, serviceCode: string): FormTemplateDefinition {
  if (serviceCode !== "DEATH_ONTIME") return definition;
  const fields: FormFieldDefinition[] = [
    {
      key: "requester_relationship", type: "select", label: "Requester's relationship or role", required: false,
      options: [
        { value: "spouse", label: "Spouse" },
        { value: "child", label: "Child" },
        { value: "parent", label: "Parent" },
        { value: "sibling", label: "Sibling" },
        { value: "other_relative", label: "Other relative" },
        { value: "funeral_representative", label: "Funeral service representative" },
        { value: "informant", label: "Informant (person reporting the death)" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "requester_relationship_other", type: "text", label: "Please specify", required: true,
      visibleWhen: { field: "requester_relationship", operator: "equals", value: "other" },
    },
  ];
  let added = false;
  return {
    ...definition,
    sections: definition.sections.map((section) => {
      const remaining = section.fields.filter((field) => !fields.some((item) => item.key === field.key));
      if (section.step !== "case" || added) return { ...section, fields: remaining };
      added = true;
      const notesIndex = remaining.findIndex((field) => field.key === "additional_notes");
      const index = notesIndex < 0 ? remaining.length : notesIndex;
      return { ...section, fields: [...remaining.slice(0, index), ...fields, ...remaining.slice(index)] };
    }),
  };
}
