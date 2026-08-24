import { toDateKey } from "~/lib/date";
import { flattenSubjects, type SubjectFields } from "~/lib/subject-fields";
import {
  formTemplateDefinitionSchema,
  type FormFieldDefinition,
  type FormStep,
  type FormTemplateDefinition,
  type TemplateAnswers,
} from "./form-template.types";

const PURPOSE_OPTIONS = [
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

export function fieldsForStep(
  definition: FormTemplateDefinition,
  step: FormStep,
): FormFieldDefinition[] {
  return definition.sections
    .filter((section) => section.step === step)
    .flatMap((section) => section.fields);
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
  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (!isFieldVisible(field, answers)) continue;
      const answer = answers[field.key];

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
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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
  const output: Record<string, string> = {};
  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (!isFieldVisible(field, answers)) continue;
      const value = answers[field.key];
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
  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (field.type !== "person_group") labels[field.key] = field.label;
    }
  }
  return labels;
}
