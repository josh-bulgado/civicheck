import { z } from "zod";

export const formStepSchema = z.enum(["case", "details"]);
export const formFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "date",
  "phone",
  "select",
  "person_group",
]);

export const formOptionSchema = z.object({
  value: z.string().min(1).max(120),
  label: z.string().min(1).max(160),
});

export const formConditionSchema = z.object({
  field: z.string().min(1).max(64),
  operator: z.enum(["equals", "not_equals"]),
  value: z.string().min(1).max(120),
});

/**
 * A deliberately small, data-safe condition language shared by service
 * routing and requirement applicability. The engine is code; the civil
 * registry rules and values live in the database.
 */
export const conditionRuleSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z.array(formConditionSchema).min(1).max(20),
});

export const caseSelectorQuestionSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores"),
  label: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  options: z.array(formOptionSchema).min(2).max(20),
  visibleWhen: conditionRuleSchema.optional(),
});

export const caseSelectorOutcomeSchema = z.object({
  serviceCode: z.string().min(1).max(80),
  when: conditionRuleSchema,
});

export const caseSelectorDefinitionSchema = z.object({
  title: z.string().min(1).max(160).default("Find the right service"),
  description: z.string().max(500).optional(),
  questions: z.array(caseSelectorQuestionSchema).min(1).max(10),
  outcomes: z.array(caseSelectorOutcomeSchema).min(1).max(100),
});

export const ageBandSchema = z.object({
  value: z.string().min(1).max(120),
  label: z.string().min(1).max(160),
  minAge: z.number().int().min(0).max(150),
  maxAge: z.number().int().min(0).max(150).optional(),
  notice: z
    .object({
      variant: z.enum(["default", "warning", "destructive", "success"]),
      title: z.string().min(1).max(160),
      description: z.string().min(1).max(500),
      blocksProgress: z.boolean().default(false),
    })
    .optional(),
});

/**
 * A value calculated from applicant-entered dates. The calculation engine is
 * generic; field references and age boundaries remain versioned database data.
 */
export const derivedAnswerSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores"),
  label: z.string().min(1).max(160),
  kind: z.literal("age_band"),
  dateField: z.string().min(1).max(64),
  referenceDateField: z.string().min(1).max(64).optional(),
  required: z.boolean().default(true),
  bands: z.array(ageBandSchema).min(1).max(20),
});

export const formFieldDefinitionSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores"),
  type: formFieldTypeSchema,
  label: z.string().min(1).max(160),
  required: z.boolean().default(false),
  placeholder: z.string().max(240).optional(),
  helpText: z.string().max(500).optional(),
  options: z.array(formOptionSchema).max(100).optional(),
  dateDirection: z.enum(["past", "future", "any"]).optional(),
  visibleWhen: formConditionSchema.optional(),
});

export const formSectionDefinitionSchema = z.object({
  key: z.string().min(1).max(64),
  step: formStepSchema,
  title: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  fields: z.array(formFieldDefinitionSchema).max(100),
});

export const formTemplateDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    caseSelector: caseSelectorDefinitionSchema.optional(),
    derivedAnswers: z.array(derivedAnswerSchema).max(20).optional(),
    sections: z.array(formSectionDefinitionSchema).min(1).max(10),
  })
  .superRefine((definition, context) => {
    const keys = new Set<string>();
    const stepsByKey = new Map<string, z.infer<typeof formStepSchema>>();
    let personGroups = 0;
    for (const section of definition.sections) {
      for (const field of section.fields) {
        if (keys.has(field.key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Field key "${field.key}" is used more than once`,
            path: ["sections"],
          });
        }
        keys.add(field.key);
        stepsByKey.set(field.key, section.step);

        if (field.type === "person_group") personGroups += 1;

        if (field.type === "select" && !field.options?.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Select field "${field.label}" needs at least one option`,
            path: ["sections"],
          });
        }
        if (field.type === "select" && field.options) {
          const optionValues = new Set<string>();
          for (const option of field.options) {
            if (optionValues.has(option.value)) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Dropdown "${field.label}" has duplicate option value "${option.value}"`,
                path: ["sections"],
              });
            }
            optionValues.add(option.value);
          }
        }
      }
    }
    if (personGroups !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The application form must contain exactly one person name group",
        path: ["sections"],
      });
    }

    const allFields = definition.sections.flatMap((section) => section.fields);
    const derivedKeys = new Set<string>();
    const derivedOptions = new Map<string, z.infer<typeof formOptionSchema>[]>();
    for (const [derivedIndex, derived] of (definition.derivedAnswers ?? []).entries()) {
      if (keys.has(derived.key) || derivedKeys.has(derived.key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Derived answer key "${derived.key}" is used more than once`,
          path: ["derivedAnswers", derivedIndex, "key"],
        });
      }
      derivedKeys.add(derived.key);

      const dateField = allFields.find((field) => field.key === derived.dateField);
      const referenceField = derived.referenceDateField
        ? allFields.find((field) => field.key === derived.referenceDateField)
        : undefined;
      if (dateField?.type !== "date") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Derived answer "${derived.label}" needs a valid date field`,
          path: ["derivedAnswers", derivedIndex, "dateField"],
        });
      }
      if (derived.referenceDateField && referenceField?.type !== "date") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Derived answer "${derived.label}" needs a valid reference date field`,
          path: ["derivedAnswers", derivedIndex, "referenceDateField"],
        });
      }

      const bandValues = new Set<string>();
      const orderedBands = [...derived.bands].sort((a, b) => a.minAge - b.minAge);
      for (const [bandIndex, band] of orderedBands.entries()) {
        if (band.maxAge !== undefined && band.maxAge < band.minAge) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Age band "${band.label}" has an invalid range`,
            path: ["derivedAnswers", derivedIndex, "bands", bandIndex],
          });
        }
        if (bandValues.has(band.value)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Derived answer "${derived.label}" has duplicate value "${band.value}"`,
            path: ["derivedAnswers", derivedIndex, "bands", bandIndex],
          });
        }
        const previous = orderedBands[bandIndex - 1];
        if (
          previous &&
          (previous.maxAge === undefined || previous.maxAge >= band.minAge)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Age bands for "${derived.label}" overlap`,
            path: ["derivedAnswers", derivedIndex, "bands", bandIndex],
          });
        }
        bandValues.add(band.value);
      }
      derivedOptions.set(
        derived.key,
        derived.bands.map((band) => ({ value: band.value, label: band.label })),
      );
    }
    for (const section of definition.sections) {
      for (const field of section.fields) {
        if (field.visibleWhen && !keys.has(field.visibleWhen.field)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Visibility condition for "${field.label}" references a missing field`,
            path: ["sections"],
          });
        } else if (
          field.visibleWhen &&
          stepsByKey.get(field.visibleWhen.field) !== section.step
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Visibility condition for "${field.label}" must reference a field on the same step`,
            path: ["sections"],
          });
        } else if (field.visibleWhen) {
          const source = definition.sections
            .flatMap((candidateSection) => candidateSection.fields)
            .find((candidate) => candidate.key === field.visibleWhen?.field);
          if (source?.type === "person_group") {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Visibility condition for "${field.label}" cannot use a person name group`,
              path: ["sections"],
            });
          }
        }
      }
    }

    if (definition.caseSelector) {
      const questionKeys = new Set<string>();
      const questionsByKey = new Map<string, z.infer<typeof caseSelectorQuestionSchema>>();
      for (const [questionIndex, question] of definition.caseSelector.questions.entries()) {
        if (questionKeys.has(question.key) || derivedKeys.has(question.key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Case question key "${question.key}" is used more than once`,
            path: ["caseSelector", "questions", questionIndex, "key"],
          });
        }

        const optionValues = new Set<string>();
        for (const option of question.options) {
          if (optionValues.has(option.value)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Case question "${question.label}" has duplicate option value "${option.value}"`,
              path: ["caseSelector", "questions", questionIndex, "options"],
            });
          }
          optionValues.add(option.value);
        }

        for (const condition of question.visibleWhen?.conditions ?? []) {
          if (!questionKeys.has(condition.field) && !derivedKeys.has(condition.field)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Visibility for "${question.label}" must use an earlier case question`,
              path: ["caseSelector", "questions", questionIndex, "visibleWhen"],
            });
          } else if (!(
            questionsByKey.get(condition.field)?.options ??
            derivedOptions.get(condition.field) ??
            []
          ).some((option) => option.value === condition.value)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Visibility for "${question.label}" uses an invalid answer value`,
              path: ["caseSelector", "questions", questionIndex, "visibleWhen"],
            });
          }
        }
        questionKeys.add(question.key);
        questionsByKey.set(question.key, question);
      }

      const outcomeCodes = new Set<string>();
      for (const [outcomeIndex, outcome] of definition.caseSelector.outcomes.entries()) {
        if (outcomeCodes.has(outcome.serviceCode)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Service variant "${outcome.serviceCode}" is mapped more than once`,
            path: ["caseSelector", "outcomes", outcomeIndex, "serviceCode"],
          });
        }
        outcomeCodes.add(outcome.serviceCode);
        for (const condition of outcome.when.conditions) {
          if (!questionKeys.has(condition.field) && !derivedKeys.has(condition.field)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Outcome for "${outcome.serviceCode}" references a missing case question`,
              path: ["caseSelector", "outcomes", outcomeIndex, "when"],
            });
          } else if (!(
            questionsByKey.get(condition.field)?.options ??
            derivedOptions.get(condition.field) ??
            []
          ).some((option) => option.value === condition.value)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Outcome for "${outcome.serviceCode}" uses an invalid answer value`,
              path: ["caseSelector", "outcomes", outcomeIndex, "when"],
            });
          }
        }
      }
    }
  });

export type FormStep = z.infer<typeof formStepSchema>;
export type FormFieldType = z.infer<typeof formFieldTypeSchema>;
export type FormOption = z.infer<typeof formOptionSchema>;
export type FormCondition = z.infer<typeof formConditionSchema>;
export type ConditionRule = z.infer<typeof conditionRuleSchema>;
export type CaseSelectorQuestion = z.infer<typeof caseSelectorQuestionSchema>;
export type CaseSelectorOutcome = z.infer<typeof caseSelectorOutcomeSchema>;
export type CaseSelectorDefinition = z.infer<typeof caseSelectorDefinitionSchema>;
export type AgeBand = z.infer<typeof ageBandSchema>;
export type DerivedAnswer = z.infer<typeof derivedAnswerSchema>;
export type FormFieldDefinition = z.infer<typeof formFieldDefinitionSchema>;
export type FormSectionDefinition = z.infer<typeof formSectionDefinitionSchema>;
export type FormTemplateDefinition = z.infer<typeof formTemplateDefinitionSchema>;

export interface PublishedFormTemplate {
  templateId: string | null;
  templateKey: string;
  templateName: string;
  versionId: string | null;
  version: number;
  definition: FormTemplateDefinition;
}

export type TemplateAnswerValue =
  | string
  | Array<{
      role: string;
      firstName: string;
      middleName: string;
      lastName: string;
      suffix: string;
      sex: string;
    }>;

export type TemplateAnswers = Record<string, TemplateAnswerValue>;
