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
  value: z.string().max(120),
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
  });

export type FormStep = z.infer<typeof formStepSchema>;
export type FormFieldType = z.infer<typeof formFieldTypeSchema>;
export type FormOption = z.infer<typeof formOptionSchema>;
export type FormCondition = z.infer<typeof formConditionSchema>;
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
