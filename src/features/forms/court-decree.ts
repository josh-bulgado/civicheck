import type { FormTemplateDefinition, TemplateAnswers } from "./form-template.types";

export function isCourtDecree(serviceCode: string) {
  return ["COURT-ANNULMENT", "COURT-FOREIGN-ADOPTION"].includes(serviceCode);
}

export function courtRecordType(answers: TemplateAnswers): "birth" | "marriage" | null {
  if (answers.court_decree_type === "adoption") return "birth";
  if (["annulment_nullity", "legal_separation"].includes(String(answers.court_decree_type))) return "marriage";
  if (answers.court_decree_type === "foreign_decree" && ["birth", "marriage"].includes(String(answers.record_type))) {
    return answers.record_type as "birth" | "marriage";
  }
  return null;
}

export function courtDecreeRoles(serviceCode: string, answers: TemplateAnswers, fallback: string[]) {
  if (!isCourtDecree(serviceCode)) return fallback;
  const record = courtRecordType(answers);
  return record === "marriage" ? ["Husband", "Wife"] : record === "birth" ? ["Subject"] : fallback;
}

// Use the affected record's fields and omit answers from the other record type.
export function courtRecordLayout(definition: FormTemplateDefinition, answers: TemplateAnswers): FormTemplateDefinition {
  const fields = definition.sections.flatMap((section) => section.fields);
  const court = definition.caseSelector?.questions.some((question) => question.key === "court_decree_type") ||
    fields.some((field) => field.key === "court_decree_type");
  if (!court || !fields.some((field) => field.key === "birth_date")) return definition;
  const record = courtRecordType(answers);
  return {
    ...definition,
    sections: definition.sections.map((section) => ({
      ...section,
      fields: section.fields.filter((field) => {
        if (["birth_date", "birth_place"].includes(field.key)) return record === "birth";
        if (["marriage_date", "marriage_place"].includes(field.key)) return record === "marriage";
        return true;
      }),
    })),
  };
}
