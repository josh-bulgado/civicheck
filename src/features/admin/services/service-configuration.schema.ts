import { z } from "zod";
import {
  conditionRuleSchema,
  formTemplateDefinitionSchema,
  type ConditionRule,
  type FormTemplateDefinition,
} from "~/features/forms/form-template.types";
import {
  feeComponentSchema,
  feeComponentsIssue,
} from "~/features/services/fee-components";

// ─── Service configuration payload ───────────────────────────────────────────
// Everything the admin service editor saves in one go: the registry row, the
// requirement checklist, and the application form. The editor checks the same
// rules for instant feedback, but this schema — run by the save function — is
// the check that counts: what it lets through is what applicants are shown.

const serviceCodeSchema = z
  .string()
  .trim()
  .min(1, "Service code is required")
  .max(80)
  .regex(
    /^[A-Z0-9_-]+$/,
    "Use uppercase letters, numbers, underscores, and hyphens only",
  );

/** Blank optional text is stored as NULL, never as an empty string. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);

// Group keys end up in URLs and in checklist lookups, so they stay slug-like.
const groupKeySchema = z
  .string()
  .trim()
  .max(80)
  .regex(
    /^[A-Za-z0-9_-]*$/,
    "Use letters, numbers, underscores, and hyphens only",
  )
  .nullable()
  .transform((value) => value || null);

export const serviceFieldsSchema = z
  .object({
    name: z.string().trim().min(1, "Service name is required").max(200),
    classification: z.enum(["simple", "complex", "highly_technical"]),
    fee: z.number().finite().min(0).max(1_000_000),
    // Optional: a save that does not carry it leaves the stored breakdown be.
    fee_components: z.array(feeComponentSchema).max(20).optional(),
    processing_time: z
      .string()
      .trim()
      .min(1, "Processing time is required")
      .max(200),
    department_id: optionalText(64),
    steps_description: z.array(z.string().trim().min(1).max(2_000)).max(30),
    party_roles: z.array(z.string().trim().min(1).max(160)).min(1).max(10),
    event_date_label: optionalText(160),
    event_place_label: optionalText(160),
    event_date_direction: z.enum(["past", "future", "any"]),
    reference_number_label: optionalText(160),
    asks_purpose: z.boolean(),
    asks_birth_details: z.boolean(),
    // Optional: a save that does not carry the switch leaves it as it is.
    allows_messages: z.boolean().optional(),
    display_group: groupKeySchema,
    display_name: optionalText(200),
    requirement_group: groupKeySchema,
  })
  .superRefine((service, context) => {
    const feeIssue = feeComponentsIssue(
      service.fee_components ?? [],
      service.fee,
    );
    if (feeIssue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: feeIssue,
        path: ["fee_components"],
      });
    }

    // Uploads are slotted per role, so two people can't share one.
    const seen = new Set<string>();
    for (const [index, role] of service.party_roles.entries()) {
      const key = role.toLocaleLowerCase();
      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${role}" is listed more than once`,
          path: ["party_roles", index],
        });
      }
      seen.add(key);
    }
  });

export const requirementInputSchema = z.object({
  /** Id of the checklist row this edits; absent for a row added in the editor. */
  id: z.string().uuid().nullable().optional(),
  requirement_name: z.string().trim().min(1, "Requirement is required").max(500),
  where_to_secure: optionalText(300),
  case_tag: optionalText(120),
  applies_when: conditionRuleSchema.nullable(),
  is_mandatory: z.boolean(),
  requires_upload: z.boolean(),
  upload_scope: z.enum(["request", "each_subject", "specific_subject"]),
  subject_role: optionalText(160),
});

export const serviceFormInputSchema = z.object({
  templateName: z.string().trim().min(1).max(160),
  definition: formTemplateDefinitionSchema,
  /** Active version the editor loaded; null when the service has no form yet. */
  expectedVersionId: z.string().uuid().nullable(),
});

export const saveServiceConfigurationSchema = z.object({
  mode: z.enum(["create", "update"]),
  serviceCode: serviceCodeSchema,
  service: serviceFieldsSchema,
  requirements: z.array(requirementInputSchema).max(200),
  /** Null for a variant-only save: the form is published at the group level. */
  form: serviceFormInputSchema.nullable(),
});

export type ServiceFieldsInput = z.input<typeof serviceFieldsSchema>;
export type RequirementInput = z.input<typeof requirementInputSchema>;
export type SaveServiceConfigurationInput = z.input<
  typeof saveServiceConfigurationSchema
>;

interface RequirementRule {
  requires_upload: boolean;
  upload_scope: "request" | "each_subject" | "specific_subject";
  subject_role?: string | null;
  applies_when?: ConditionRule | null;
}

/**
 * Check a checklist against the form it is shown with, and return the first
 * problem as a message (null when there is none).
 *
 * A requirement's condition is only meaningful while the question it names is
 * still asked and the answer it names is still offered. One that points at a
 * removed question never matches, so the document would silently drop off every
 * applicant's checklist.
 */
export function findRequirementIssue(
  definition: FormTemplateDefinition,
  requirements: RequirementRule[],
  partyRoles: string[],
): string | null {
  const conditionSources = new Map(
    [
      ...(definition.caseSelector?.questions ?? []),
      ...(definition.derivedAnswers ?? []).map((derived) => ({
        key: derived.key,
        options: derived.bands.map((band) => ({
          value: band.value,
          label: band.label,
        })),
      })),
      ...definition.sections.flatMap((section) =>
        section.fields.filter((field) => field.type === "select"),
      ),
    ].map((source) => [source.key, source] as const),
  );

  for (const [index, requirement] of requirements.entries()) {
    if (
      requirement.requires_upload &&
      requirement.upload_scope === "specific_subject" &&
      !partyRoles.some(
        (role) => role.trim() === requirement.subject_role?.trim(),
      )
    ) {
      return `Choose a valid person for requirement ${index + 1}.`;
    }

    for (const condition of requirement.applies_when?.conditions ?? []) {
      const source = conditionSources.get(condition.field);
      if (!source) {
        return `Requirement ${index + 1} uses a question that no longer exists.`;
      }
      if (
        source.options?.length &&
        !source.options.some((option) => option.value === condition.value)
      ) {
        return `Requirement ${index + 1} uses an answer that no longer exists.`;
      }
    }
  }

  return null;
}
