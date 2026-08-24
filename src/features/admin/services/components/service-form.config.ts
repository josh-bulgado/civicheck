import z from "zod";
import { parseRequirementName } from "~/features/services/service-utils";
import {
  conditionRuleSchema,
  type FormTemplateDefinition,
} from "~/features/forms/form-template.types";
import { buildLegacyFormDefinition } from "~/features/forms/form-template.utils";
import type {
  EventDateDirection,
  Service,
  ServiceClassification,
  ServiceRequirement,
} from "../services.types";

const requirementSchema = z.object({
  requirement_name: z.string().trim().min(1, "Requirement is required"),
  where_to_secure: z.string().optional(),
  is_mandatory: z.boolean(),
  case_tag: z.string().optional(),
  applies_when: conditionRuleSchema.nullable(),
  requires_upload: z.boolean(),
  upload_scope: z.enum(["request", "each_subject", "specific_subject"]),
  subject_role: z.string().optional(),
});

// `fee` stays a string so the resolver's input and output types match the text
// input; it is converted once, at submit.
export function buildServiceFormSchema(takenCodes: Set<string>) {
  return z.object({
    service_code: z
      .string()
      .trim()
      .min(1, "Service code is required")
      .regex(
        /^[A-Z0-9_-]+$/,
        "Use uppercase letters, numbers, underscores, and hyphens only",
      )
      .refine(
        (code) => !takenCodes.has(code),
        "A service with this code already exists",
      ),
    name: z.string().trim().min(1, "Service name is required"),
    classification: z.enum(["simple", "complex", "highly_technical"]),
    fee: z
      .string()
      .trim()
      .min(1, "Fee is required — enter 0 for a free service")
      .refine(
        (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
        "Enter a valid amount (0 or more)",
      ),
    processing_time: z.string().trim().min(1, "Processing time is required"),
    department_id: z.string().optional(),
    steps: z.array(z.object({ value: z.string() })),
    party_roles: z.array(z.object({ value: z.string() })),
    requirements: z.array(requirementSchema),
    event_date_label: z.string().optional(),
    event_place_label: z.string().optional(),
    event_date_direction: z.enum(["past", "future", "any"]),
    reference_number_label: z.string().optional(),
    asks_purpose: z.boolean(),
    asks_birth_details: z.boolean(),
    display_group: z.string().optional(),
    display_name: z.string().optional(),
    requirement_group: z.string().optional(),
  });
}

export type ServiceFormValues = z.infer<
  ReturnType<typeof buildServiceFormSchema>
>;

/** Select items cannot use an empty value, so unassigned needs a sentinel. */
export const UNASSIGNED_DEPARTMENT_VALUE = "unassigned";

export const SERVICE_CLASSIFICATIONS: {
  value: ServiceClassification;
  label: string;
  hint: string;
}[] = [
  { value: "simple", label: "Simple", hint: "Resolved within 3 working days" },
  { value: "complex", label: "Complex", hint: "Resolved within 7 working days" },
  {
    value: "highly_technical",
    label: "Highly Technical",
    hint: "Resolved within 20 working days",
  },
];

export const STEP_PLACEHOLDERS = [
  "SUBMIT — what the applicant hands over, and what CCRO checks or signs.",
  "PAY — what the cashier collects and issues.",
  "CLAIM — what the applicant receives, and when.",
];

export function defaultPartyRoles() {
  return [{ value: "Subject" }];
}

export const DATE_DIRECTIONS: {
  value: EventDateDirection;
  label: string;
}[] = [
  { value: "past", label: "Past dates only" },
  { value: "future", label: "Future dates only" },
  { value: "any", label: "Any date" },
];

export const SERVICE_EDITOR_SECTIONS = [
  { id: "registry-details", label: "Registry Details" },
  { id: "citizen-journey", label: "Citizen Journey" },
  { id: "case-questions", label: "Case Questions" },
  { id: "application-form", label: "Application Form" },
  { id: "requirements", label: "Requirements" },
  { id: "relationships", label: "Relationships" },
] as const;

export const EMPTY_REQUIREMENT = {
  requirement_name: "",
  where_to_secure: "",
  is_mandatory: true,
  case_tag: "",
  applies_when: null,
  requires_upload: true,
  upload_scope: "request" as const,
  subject_role: "",
};

export function genericFormDefinition(): FormTemplateDefinition {
  return buildLegacyFormDefinition({
    service_code: "NEW_SERVICE",
    name: "New service",
    event_date_direction: "past",
    asks_purpose: true,
    asks_birth_details: false,
  });
}

export function emptyServiceFormDefaults(): ServiceFormValues {
  return {
    service_code: "",
    name: "",
    classification: "simple",
    fee: "",
    processing_time: "",
    department_id: UNASSIGNED_DEPARTMENT_VALUE,
    steps: STEP_PLACEHOLDERS.map(() => ({ value: "" })),
    party_roles: defaultPartyRoles(),
    requirements: [{ ...EMPTY_REQUIREMENT }],
    event_date_label: "",
    event_place_label: "",
    event_date_direction: "past",
    reference_number_label: "",
    asks_purpose: true,
    asks_birth_details: false,
    display_group: "",
    display_name: "",
    requirement_group: "",
  };
}

export function serviceFormDefaults(service: Service): ServiceFormValues {
  return {
    service_code: service.service_code,
    name: service.name,
    classification: service.classification ?? "simple",
    fee: String(service.fee ?? 0),
    processing_time: service.processing_time ?? "",
    department_id: service.department_id ?? UNASSIGNED_DEPARTMENT_VALUE,
    steps: (service.steps_description ?? []).map((value) => ({ value })),
    party_roles: service.party_roles?.length
      ? service.party_roles.map((value) => ({ value }))
      : defaultPartyRoles(),
    requirements: [],
    event_date_label: service.event_date_label ?? "",
    event_place_label: service.event_place_label ?? "",
    event_date_direction: service.event_date_direction,
    reference_number_label: service.reference_number_label ?? "",
    asks_purpose: service.asks_purpose,
    asks_birth_details: service.asks_birth_details,
    display_group: service.display_group ?? "",
    display_name: service.display_name ?? "",
    requirement_group: service.requirement_group ?? "",
  };
}

export function toServiceFormRequirement(requirement: ServiceRequirement) {
  const { primary, secondary } = parseRequirementName(
    requirement.requirement_name,
  );
  const hasOwnColumn = Boolean(requirement.where_to_secure);

  return {
    requirement_name: hasOwnColumn ? requirement.requirement_name : primary,
    where_to_secure: requirement.where_to_secure ?? secondary ?? "",
    is_mandatory: requirement.is_mandatory,
    case_tag: requirement.case_tag ?? "",
    applies_when: requirement.applies_when ?? null,
    requires_upload: requirement.requires_upload,
    upload_scope: requirement.upload_scope,
    subject_role: requirement.subject_role ?? "",
  };
}
