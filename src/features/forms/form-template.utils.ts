import { ageInYears, fromDateKey, toDateKey } from "~/lib/date";
import { flattenSubjects, type SubjectFields } from "~/lib/subject-fields";
import {
  conditionRuleSchema,
  formTemplateDefinitionSchema,
  type CaseSelectorQuestion,
  type ConditionRule,
  type FormCondition,
  type FormFieldDefinition,
  type FormStep,
  type FormTemplateDefinition,
  type TemplateAnswers,
} from "./form-template.types";

// Exported so the admin service report can bucket anything outside this list
// as "Other" — `flattenTemplateAnswers` below overwrites "Other" with the
// applicant's free text, so the stored vocabulary is open-ended.
export const PURPOSE_OPTIONS = [
  "Local Use (ID, Barangay, etc.)",
  "Employment",
  "Passport / Travel",
  "School Records / Admission",
  "Social Security (SSS/GSIS/etc.)",
  "Legal / Court proceedings",
  "Other",
].map((value) => ({ value, label: value }));

const PLACE_TYPE_OPTIONS = [
  { value: "hospital", label: "Hospital / Clinic" },
  { value: "home", label: "Home" },
  { value: "other", label: "Other" },
];

const INFORMANT_OPTIONS = [
  "Mother",
  "Father",
  "Grandparent",
  "Guardian",
  "Physician / Midwife",
  "Other",
].map((value) => ({ value, label: value }));

type LegacyServiceConfig = {
  service_code: string;
  name: string;
  event_date_label?: string | null;
  event_place_label?: string | null;
  event_date_direction?: "past" | "future" | "any";
  reference_number_label?: string | null;
  asks_purpose?: boolean;
  asks_birth_details?: boolean;
};

/**
 * Safe compatibility template for databases that have not applied the form
 * template migration yet, and for a newly-created service before its first
 * explicit form version is published.
 */
export function buildLegacyFormDefinition(
  service: LegacyServiceConfig,
): FormTemplateDefinition {
  const caseFields: FormFieldDefinition[] = [
    {
      key: "event_date",
      type: "date",
      label: service.event_date_label || "Date of event",
      required: true,
      dateDirection: service.event_date_direction ?? "past",
    },
    {
      key: "event_place",
      type: "text",
      label: service.event_place_label || "Place of event",
      required: true,
      placeholder: "e.g. Legazpi City, Albay",
    },
  ];

  if (service.asks_birth_details) {
    caseFields.push(
      {
        key: "place_type",
        type: "select",
        label: "Where did the birth take place?",
        required: false,
        options: PLACE_TYPE_OPTIONS,
      },
      {
        key: "informant_relationship",
        type: "select",
        label: "Informant's relationship to the child",
        required: false,
        options: INFORMANT_OPTIONS,
      },
      {
        key: "informant_name",
        type: "text",
        label: "Informant's name",
        required: false,
        placeholder: "Full name of the person reporting the birth",
      },
    );
  }

  if (service.reference_number_label) {
    caseFields.push({
      key: "reference_number",
      type: "text",
      label: service.reference_number_label,
      required: false,
    });
  }

  if (service.asks_purpose ?? true) {
    caseFields.push(
      {
        key: "purpose",
        type: "select",
        label: "Purpose of request",
        required: true,
        options: PURPOSE_OPTIONS,
      },
      {
        key: "purpose_other",
        type: "text",
        label: "Specify purpose",
        required: true,
        visibleWhen: { field: "purpose", operator: "equals", value: "Other" },
      },
    );
  }

  caseFields.push({
    key: "additional_notes",
    type: "textarea",
    label: "Additional notes",
    required: false,
    placeholder: "Any special requests or instructions…",
  });

  return {
    schemaVersion: 1,
    sections: [
      { key: "case", step: "case", title: "Case details", fields: caseFields },
      {
        key: "details",
        step: "details",
        title: "Your details",
        fields: [
          {
            key: "subjects",
            type: "person_group",
            label: "Person named on the record",
            required: true,
          },
          {
            key: "contact_number",
            type: "phone",
            label: "Contact number",
            required: false,
            placeholder: "9171234567",
          },
        ],
      },
    ],
  };
}

export function parseFormTemplateDefinition(value: unknown): FormTemplateDefinition {
  return formTemplateDefinitionSchema.parse(value);
}

export function parseConditionRule(value: unknown): ConditionRule | null {
  const parsed = conditionRuleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function fieldsForStep(
  definition: FormTemplateDefinition,
  step: FormStep,
): FormFieldDefinition[] {
  return definition.sections
    .filter((section) => section.step === step)
    .flatMap((section) => section.fields);
}

function answerString(
  answers: TemplateAnswers | Record<string, string>,
  key: string,
) {
  const answer = answers[key];
  return typeof answer === "string" ? answer : "";
}

/**
 * Recalculate all database-defined derived values from their source dates.
 * Any submitted value for a derived key is discarded first, so callers cannot
 * spoof an age bracket on either the client or server.
 */
export function deriveTemplateAnswers(
  definition: FormTemplateDefinition,
  answers: TemplateAnswers | Record<string, string>,
  todayKey: string = toDateKey(),
): TemplateAnswers {
  const output: TemplateAnswers = { ...answers };
  for (const derived of definition.derivedAnswers ?? []) {
    delete output[derived.key];
    const birthDateKey = answerString(output, derived.dateField);
    const referenceDateKey = derived.referenceDateField
      ? answerString(output, derived.referenceDateField)
      : todayKey;
    const birthDate = fromDateKey(birthDateKey);
    const referenceDate = fromDateKey(referenceDateKey);
    if (!birthDate || !referenceDate || birthDate > referenceDate) continue;

    const age = ageInYears(birthDateKey, referenceDateKey);
    const band = derived.bands.find(
      (candidate) =>
        age >= candidate.minAge &&
        (candidate.maxAge === undefined || age <= candidate.maxAge),
    );
    if (band) output[derived.key] = band.value;
  }
  return output;
}

export function getDerivedAnswerFeedback(
  definition: FormTemplateDefinition,
  answers: TemplateAnswers | Record<string, string>,
  todayKey: string = toDateKey(),
) {
  const effectiveAnswers = deriveTemplateAnswers(definition, answers, todayKey);
  return (definition.derivedAnswers ?? []).flatMap((derived) => {
    const value = answerString(effectiveAnswers, derived.key);
    const band = derived.bands.find((candidate) => candidate.value === value);
    if (!band?.notice) return [];
    const birthDateKey = answerString(effectiveAnswers, derived.dateField);
    const referenceDateKey = derived.referenceDateField
      ? answerString(effectiveAnswers, derived.referenceDateField)
      : todayKey;
    const birthDate = fromDateKey(birthDateKey);
    const referenceDate = fromDateKey(referenceDateKey);
    if (!birthDate || !referenceDate || birthDate > referenceDate) return [];
    return [
      {
        key: derived.key,
        label: derived.label,
        age: ageInYears(birthDateKey, referenceDateKey),
        band,
        notice: band.notice,
      },
    ];
  });
}

function validateDerivedAnswers(
  definition: FormTemplateDefinition,
  answers: TemplateAnswers,
): { success: true } | { success: false; message: string } {
  const effectiveAnswers = deriveTemplateAnswers(definition, answers);
  for (const derived of definition.derivedAnswers ?? []) {
    if (!derived.required) continue;
    const sourceDate = answerString(effectiveAnswers, derived.dateField);
    const sourceField = definition.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === derived.dateField);
    const referenceDate = derived.referenceDateField
      ? answerString(effectiveAnswers, derived.referenceDateField)
      : toDateKey();
    const referenceField = derived.referenceDateField
      ? definition.sections
          .flatMap((section) => section.fields)
          .find((field) => field.key === derived.referenceDateField)
      : undefined;
    if (!sourceDate) {
      return {
        success: false,
        message: `${sourceField?.label ?? derived.label} is required.`,
      };
    }
    if (!fromDateKey(sourceDate)) {
      return {
        success: false,
        message: `${sourceField?.label ?? derived.label} must be a valid date.`,
      };
    }
    if (!referenceDate) {
      return {
        success: false,
        message: `${referenceField?.label ?? "Reference date"} is required.`,
      };
    }
    if (!fromDateKey(referenceDate)) {
      return {
        success: false,
        message: `${referenceField?.label ?? "Reference date"} must be a valid date.`,
      };
    }
    if (sourceDate > referenceDate) {
      return {
        success: false,
        message: `${sourceField?.label ?? derived.label} cannot be after ${referenceField?.label?.toLowerCase() ?? "the reference date"}.`,
      };
    }
    if (!answerString(effectiveAnswers, derived.key)) {
      return {
        success: false,
        message: `${derived.label} is outside the supported age range.`,
      };
    }
    const blockingFeedback = getDerivedAnswerFeedback(
      definition,
      effectiveAnswers,
    ).find(
      (feedback) =>
        feedback.key === derived.key && feedback.notice.blocksProgress,
    );
    if (blockingFeedback) {
      return {
        success: false,
        message: blockingFeedback.notice.description,
      };
    }
  }
  return { success: true };
}

export function conditionMatches(
  condition: FormCondition,
  answers: TemplateAnswers | Record<string, string>,
): boolean {
  const value = answerString(answers, condition.field);
  if (!value) return false;
  return condition.operator === "equals"
    ? value === condition.value
    : value !== condition.value;
}

export function conditionRuleMatches(
  rule: ConditionRule | null | undefined,
  answers: TemplateAnswers | Record<string, string>,
): boolean {
  if (!rule) return true;
  return rule.match === "all"
    ? rule.conditions.every((condition) => conditionMatches(condition, answers))
    : rule.conditions.some((condition) => conditionMatches(condition, answers));
}

export function visibleCaseSelectorQuestions(
  definition: FormTemplateDefinition,
  answers: TemplateAnswers | Record<string, string>,
): CaseSelectorQuestion[] {
  const effectiveAnswers = deriveTemplateAnswers(definition, answers);
  return (definition.caseSelector?.questions ?? []).filter((question) =>
    conditionRuleMatches(question.visibleWhen, effectiveAnswers),
  );
}

export function resolveCaseSelectorServiceCode(
  definition: FormTemplateDefinition,
  answers: TemplateAnswers | Record<string, string>,
): string | null {
  const selector = definition.caseSelector;
  if (!selector) return null;

  const effectiveAnswers = deriveTemplateAnswers(definition, answers);

  const visibleQuestions = visibleCaseSelectorQuestions(definition, effectiveAnswers);
  if (visibleQuestions.some((question) => !answerString(effectiveAnswers, question.key))) {
    return null;
  }

  return (
    selector.outcomes.find((outcome) =>
      conditionRuleMatches(outcome.when, effectiveAnswers),
    )?.serviceCode ?? null
  );
}

export function validateCaseSelectorAnswers(
  definition: FormTemplateDefinition,
  answers: TemplateAnswers,
): { success: true; serviceCode: string | null } | { success: false; message: string } {
  const selector = definition.caseSelector;
  if (!selector) return { success: true, serviceCode: null };

  const derivedValidation = validateDerivedAnswers(definition, answers);
  if (!derivedValidation.success) return derivedValidation;
  const effectiveAnswers = deriveTemplateAnswers(definition, answers);

  for (const question of visibleCaseSelectorQuestions(definition, effectiveAnswers)) {
    const value = answerString(effectiveAnswers, question.key);
    if (!value) {
      return { success: false, message: `${question.label} is required.` };
    }
    if (!question.options.some((option) => option.value === value)) {
      return { success: false, message: `${question.label} has an invalid selection.` };
    }
  }

  const serviceCode = resolveCaseSelectorServiceCode(definition, effectiveAnswers);
  if (!serviceCode) {
    return {
      success: false,
      message: "These case answers do not resolve to an available service variant.",
    };
  }
  return { success: true, serviceCode };
}

export function isFieldVisible(
  field: FormFieldDefinition,
  answers: TemplateAnswers,
): boolean {
  if (!field.visibleWhen) return true;
  const current = answers[field.visibleWhen.field];
  const value = typeof current === "string" ? current : "";
  return field.visibleWhen.operator === "equals"
    ? value === field.visibleWhen.value
    : value !== field.visibleWhen.value;
}

export function validateTemplateAnswers(
  definition: FormTemplateDefinition,
  answers: TemplateAnswers,
): { success: true } | { success: false; message: string } {
  const effectiveAnswers = deriveTemplateAnswers(definition, answers);
  const derivedValidation = validateDerivedAnswers(definition, effectiveAnswers);
  if (!derivedValidation.success) return derivedValidation;
  const selectorValidation = validateCaseSelectorAnswers(definition, effectiveAnswers);
  if (!selectorValidation.success) return selectorValidation;

  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (!isFieldVisible(field, effectiveAnswers)) continue;
      const answer = effectiveAnswers[field.key];

      if (field.type === "person_group") {
        const subjects = Array.isArray(answer) ? answer : [];
        if (field.required && subjects.length === 0) {
          return { success: false, message: `${field.label} is required.` };
        }
        for (const subject of subjects) {
          if (!subject.firstName?.trim() || !subject.lastName?.trim()) {
            return {
              success: false,
              message: `First and last name are required for ${subject.role || "each person"}.`,
            };
          }
          if (!subject.sex || !["male", "female"].includes(subject.sex)) {
            return {
              success: false,
              message: `Select the sex on record for ${subject.role || "each person"}.`,
            };
          }
          if (
            [subject.firstName, subject.middleName, subject.lastName, subject.suffix].some(
              (part) => part.length > 120,
            )
          ) {
            return {
              success: false,
              message: `A name entered for ${subject.role || "a person"} is too long.`,
            };
          }
        }
        continue;
      }

      const value = typeof answer === "string" ? answer.trim() : "";
      if (field.required && !value) {
        return { success: false, message: `${field.label} is required.` };
      }
      if (!value) continue;

      const maxLength = field.type === "textarea" ? 2_000 : 240;
      if (value.length > maxLength) {
        return {
          success: false,
          message: `${field.label} must be ${maxLength.toLocaleString()} characters or fewer.`,
        };
      }

      if (field.type === "phone" && !/^9\d{9}$/.test(value)) {
        return { success: false, message: `${field.label} must be a valid 10-digit mobile number.` };
      }
      if (
        field.type === "select" &&
        field.options?.length &&
        !field.options.some((option) => option.value === value)
      ) {
        return { success: false, message: `${field.label} has an invalid selection.` };
      }
      if (field.type === "date") {
        const today = toDateKey();
        if (!fromDateKey(value)) {
          return { success: false, message: `${field.label} must be a valid date.` };
        }
        if (field.dateDirection === "past" && value > today) {
          return { success: false, message: `${field.label} cannot be in the future.` };
        }
        if (field.dateDirection === "future" && value < today) {
          return { success: false, message: `${field.label} cannot be in the past.` };
        }
      }
    }
  }
  return { success: true };
}

export function flattenTemplateAnswers(
  definition: FormTemplateDefinition,
  answers: TemplateAnswers,
): Record<string, string> {
  const effectiveAnswers = deriveTemplateAnswers(definition, answers);
  const output: Record<string, string> = {};
  for (const question of visibleCaseSelectorQuestions(definition, effectiveAnswers)) {
    output[question.key] = answerString(effectiveAnswers, question.key);
  }
  for (const derived of definition.derivedAnswers ?? []) {
    const value = answerString(effectiveAnswers, derived.key);
    if (value) output[derived.key] = value;
  }
  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (!isFieldVisible(field, effectiveAnswers)) continue;
      const value = effectiveAnswers[field.key];
      if (field.type === "person_group") {
        Object.assign(output, flattenSubjects((Array.isArray(value) ? value : []) as SubjectFields[]));
      } else if (typeof value === "string") {
        // Preserve stable keys even for an optional blank value: staff views
        // can distinguish "not answered" from a field absent in that version.
        output[field.key] = value;
      }
    }
  }
  // Keep the historical storage contract used by reports and staff views:
  // "Other" is stored as the applicant's actual free-text purpose.
  if (output.purpose === "Other" && output.purpose_other?.trim()) {
    output.purpose = output.purpose_other;
    delete output.purpose_other;
  }
  return output;
}

export function templateFieldLabels(
  definition: FormTemplateDefinition,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const question of definition.caseSelector?.questions ?? []) {
    labels[question.key] = question.label;
  }
  for (const derived of definition.derivedAnswers ?? []) {
    labels[derived.key] = derived.label;
  }
  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (field.type !== "person_group") labels[field.key] = field.label;
    }
  }
  return labels;
}
