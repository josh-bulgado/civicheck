import type { FormTemplateDefinition, TemplateAnswers } from "~/features/forms/form-template.types";
import { validatePersonName, INVALID_PERSON_NAME } from "~/lib/person-name";
import { flattenSubjects, reconcileSubjects, SUFFIXES, type SubjectFields } from "~/lib/subject-fields";
import { prepareWalkInBirth } from "./walk-in-birth";
import { courtRecordLayout, courtRecordType } from "~/features/forms/court-decree";

// Keep separate staff choices while retaining the Charter's shared fee group.
export function walkInServiceChoices<T extends { serviceCode: string; name: string }>(services: T[]) {
  return services.flatMap((service) => {
    const types = service.serviceCode === "COURT-FOREIGN-ADOPTION"
      ? [{ value: "adoption", label: "Adoption" }, { value: "foreign_decree", label: "Foreign decree" }]
      : service.serviceCode === "COURT-ANNULMENT"
        ? [{ value: "annulment_nullity", label: "Annulment / Declaration of nullity of marriage" }]
        : [];
    if (!types.length) return [{ ...service, value: service.serviceCode, label: service.name, courtDecreeType: "" }];
    return types.map((type) => ({
      ...service, value: `${service.serviceCode}:${type.value}`,
      label: `Registration of Court Decrees/Orders (${type.label})`, courtDecreeType: type.value,
    }));
  });
}

// Court registration needs the names on the decree, not each person's sex.
export function prepareWalkInCourtDecree(definition: FormTemplateDefinition, answers: TemplateAnswers, roles: string[]) {
  definition = courtRecordLayout(definition, answers);
  const record = courtRecordType(answers);
  if (record) roles = record === "marriage" ? ["Husband", "Wife"] : ["Subject"];
  const people = definition.sections.flatMap((section) => section.fields).find((field) => field.type === "person_group");
  const rows = people ? answers[people.key] : undefined;
  if (!Array.isArray(rows) || rows.length !== roles.length || rows.some((row) =>
    !row || [row.firstName, row.middleName, row.lastName, row.suffix].some((value) => typeof value !== "string"))) {
    return { error: true as const, message: "Enter each person's name as recorded on the affected birth or marriage record." };
  }
  const subjects = reconcileSubjects(rows as SubjectFields[], roles).map((subject) => ({
    ...subject, sex: "", suffix: subject.role === "Wife" ? "" : subject.suffix,
  }));
  for (const subject of subjects) {
    if (!subject.firstName.trim() || !subject.lastName.trim() || (!subject.middleName.trim() && !subject.noMiddleName)) {
      return { error: true as const, message: "Enter each person's full name or select No middle name." };
    }
    if ([subject.firstName, subject.middleName, subject.lastName].some((part) =>
      part.length > 120 || validatePersonName(part) !== true)) {
      return { error: true as const, message: INVALID_PERSON_NAME };
    }
    if (subject.suffix && !SUFFIXES.some((option) => option.value === subject.suffix)) {
      return { error: true as const, message: "Select a valid suffix." };
    }
  }
  if (!["yes", "no"].includes(String(answers.issued_by_rtc_legazpi ?? ""))) {
    return { error: true as const, message: "Check whether RTC Legazpi issued the decision." };
  }
  const caseDefinition = {
    ...definition,
    sections: definition.sections.map((section) => ({ ...section, fields: section.fields.filter((field) => field.type !== "person_group") })),
  };
  const prepared = prepareWalkInBirth(caseDefinition, answers, roles);
  if (prepared.error) return prepared;
  return { ...prepared, subjects, formData: { ...prepared.formData, ...flattenSubjects(subjects) } };
}
