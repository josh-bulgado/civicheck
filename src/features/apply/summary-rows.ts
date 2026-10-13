import { formatFieldAnswer } from "~/features/forms/answer-format";
import { isFieldVisible } from "~/features/forms/form-template.utils";
import type {
  FormTemplateDefinition,
  TemplateAnswers,
} from "~/features/forms/form-template.types";
import {
  impliedSex,
  subjectFullName,
  type SubjectFields,
} from "~/lib/subject-fields";

export interface SummaryRow {
  label: string;
  value: string;
}

/**
 * What the "Details so far" card shows: only what the applicant has actually
 * entered, and only what applies to this application.
 *
 * - A field with no answer produces no row, required or optional, so the card
 *   stays empty until there is something to report and grows as they type.
 * - Fields hidden by a `visibleWhen` rule are skipped, so an answer left behind
 *   by an earlier choice never shows as if it still applied.
 * - People come first, then the template's case and details fields in the order
 *   the form lists them.
 */
export function buildSummaryRows({
  definition,
  answers,
  subjects,
  legacyPurpose,
}: {
  definition: FormTemplateDefinition;
  answers: TemplateAnswers;
  subjects: readonly SubjectFields[];
  /** The service-level purpose, for services that ask it outside the template. */
  legacyPurpose?: string;
}): SummaryRow[] {
  const rows: SummaryRow[] = [];

  const single = subjects.length === 1 && subjects[0].role === "Subject";
  for (const subject of subjects) {
    const name = subjectFullName(subject);
    if (name) {
      rows.push({ label: single ? "Record subject" : subject.role, value: name });
    }
  }
  for (const subject of subjects) {
    if (impliedSex(subject.role) !== null) continue;
    const sex =
      subject.sex === "male" ? "Male" : subject.sex === "female" ? "Female" : "";
    if (sex) {
      rows.push({
        label: subjects.length > 1 ? `${subject.role}’s sex` : "Sex",
        value: sex,
      });
    }
  }

  let coversPurpose = false;
  for (const section of definition.sections) {
    if (section.step !== "case" && section.step !== "details") continue;
    for (const field of section.fields) {
      if (field.type === "person_group") continue;
      if (!isFieldVisible(field, answers)) continue;
      const answer = answers[field.key];
      const value = typeof answer === "string" ? answer.trim() : "";
      if (!value) continue;
      if (field.key === "purpose") coversPurpose = true;
      rows.push({ label: field.label, value: formatFieldAnswer(field, value) });
    }
  }

  if (!coversPurpose && legacyPurpose?.trim()) {
    rows.push({ label: "Purpose", value: legacyPurpose.trim() });
  }

  return rows;
}
