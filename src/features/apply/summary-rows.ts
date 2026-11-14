import { formatFieldAnswer } from "~/features/forms/answer-format";
import { isFieldVisible } from "~/features/forms/form-template.utils";
import { isOnTimeBirth } from "./on-time-birth-layout";
import { formatNameHeading } from "~/features/forms/field-label";
import { isPetitionService, petitionRecordType } from "~/features/services/petition-selection";
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
  serviceCode,
}: {
  definition: FormTemplateDefinition;
  answers: TemplateAnswers;
  subjects: readonly SubjectFields[];
  /** The service-level purpose, for services that ask it outside the template. */
  legacyPurpose?: string;
  serviceCode?: string;
}): SummaryRow[] {
  const rows: (SummaryRow & { key?: string })[] = [];
  const onTimeBirth = isOnTimeBirth(serviceCode ?? "");
  const fatherParts: Record<string, string> = {};

  const personField = definition.sections.flatMap(section => section.fields).find(field => field.type === "person_group");
  const recordType = isPetitionService(serviceCode ?? "") ? petitionRecordType(answers) : answers.record_type;
  const nameLabel = (role: string) => {
    if (subjects.length > 1) {
      if (["MARRIAGE_ONTIME", "MARRIAGE_DELAYED"].includes(serviceCode ?? "")) {
        return role === "Bride" ? "Wife's Maiden Name" : role === "Groom" ? "Husband's Name" : formatNameHeading(role);
      }
      if (serviceCode === "MARRIAGE_LICENSE") return `${role}'s Information`;
      if (role === "Child" && onTimeBirth) return "Child's Information";
      if (role === "Child" && (serviceCode === "BIRTH_DELAYED" || serviceCode?.startsWith("DCOLB-"))) return "Registrant’s Information";
      return formatNameHeading(role);
    }
    if (serviceCode === "ELEC_ENDORSEMENT") return recordType === "marriage" ? "Husband's Information" : "Owner's Information";
    if (serviceCode === "OTHER_CERT") return recordType === "marriage" ? "Husband's Information" : "Owner's Information";
    if (["DEATH_ONTIME", "DEATH_DELAYED"].includes(serviceCode ?? "")) return "Registrant’s Information";
    if (serviceCode === "SUPPLEMENTAL_REPORT") return recordType === "marriage" ? "Husband's Name" : "Document Owner's Information";
    if (isPetitionService(serviceCode ?? "")) {
      return recordType === "marriage" ? "Husband's Name" : recordType === "death" ? "Deceased Person's Name" : "First Name";
    }
    if (serviceCode === "COURT-FOREIGN-ADOPTION" && answers.court_decree_type === "adoption") return "Adopted person's name";
    if (["COURT-FOREIGN-ADOPTION", "COURT-ANNULMENT"].includes(serviceCode ?? "")) return "Name on the birth record";
    const rule = personField?.labelByAnswer;
    const label = rule?.labels[String(answers[rule.field] ?? "")];
    return formatNameHeading(label ?? personField?.label ?? role);
  };
  for (const subject of subjects) {
    const name = subjectFullName(subject);
    if (name) {
      rows.push({ key: subject.role, label: nameLabel(subject.role), value: name });
    }
  }
  for (const subject of subjects) {
    if (impliedSex(subject.role) !== null) continue;
    const sex =
      subject.sex === "male" ? "Male" : subject.sex === "female" ? "Female" : "";
    if (sex) {
      rows.push({
        key: `${subject.role}_sex`,
        label: onTimeBirth && subject.role === "Child" ? "Sex" : subjects.length > 1 ? `${subject.role}’s sex` : "Sex",
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
      if (onTimeBirth && ["father_first_name", "father_middle_name", "father_last_name", "father_name"].includes(field.key)) {
        fatherParts[field.key] = value;
        continue;
      }
      if (field.key === "purpose") coversPurpose = true;
      rows.push({ key: field.key, label: field.label, value: formatFieldAnswer(field, value) });
    }
  }

  if (!coversPurpose && legacyPurpose?.trim()) {
    rows.push({ label: "Purpose", value: legacyPurpose.trim() });
  }

  if (onTimeBirth) {
    const father = fatherParts.father_name || [fatherParts.father_first_name, fatherParts.father_middle_name, fatherParts.father_last_name]
      .filter((part) => part && part !== "N/A").join(" ");
    if (father) rows.push({ key: "Father", label: "Father", value: father });
    const order = ["Child", "Child_sex", "event_date", "event_place", "place_type", "Mother", "Father"];
    const rank = (key?: string) => key && order.includes(key) ? order.indexOf(key) : order.length;
    rows.sort((a, b) => rank(a.key) - rank(b.key));
  }
  return rows.map(({ label, value }) => ({ label, value }));
}
