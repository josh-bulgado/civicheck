import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { AlertTriangle, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "~/components/ui/input-group";
import { Input } from "~/components/ui/input";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { parseRequirementName } from "~/features/services/service-utils";
import type { Department } from "~/features/admin/departments.queries";
import { getServiceChecklist } from "../services.queries";
import { useCreateServiceWithRequirements } from "../hooks/useCreateServiceWithRequirements";
import { useUpdateServiceWithRequirements } from "../hooks/useUpdateServiceWithRequirements";
import type {
  EventDateDirection,
  Service,
  ServiceClassification,
  ServiceRequirement,
} from "../services.types";

// ─── Schema ──────────────────────────────────────────────────────────────────

const requirementSchema = z.object({
  requirement_name: z.string().trim().min(1, "Requirement is required"),
  where_to_secure: z.string().optional(),
  is_mandatory: z.boolean(),
  case_tag: z.string().optional(),
});

// `fee` stays a string here so the resolver's input and output types match the
// text input; it is converted once, at submit.
function buildFormSchema(takenCodes: Set<string>) {
  return z.object({
    service_code: z
      .string()
      .trim()
      .min(1, "Service code is required")
      // Existing codes use both underscores and hyphens (DEATH_ONTIME,
      // RA9048-CCE, DCOLB-0079-BRAP), so both are allowed.
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
    // Optional: a service with no department shows as "Unassigned" in the
    // request queue rather than blocking the save.
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

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

// ─── Charter vocabulary ──────────────────────────────────────────────────────

/**
 * shadcn's Select has no empty-string item value, so "no department" needs its
 * own sentinel; it maps back to null on submit.
 */
const UNASSIGNED_DEPARTMENT_VALUE = "unassigned";

const CLASSIFICATIONS: {
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

// The charter's CLIENT STEPS column is always some variation of SUBMIT / PAY /
// CLAIM, so seed a new service with those three rows.
const STEP_PLACEHOLDERS = [
  "SUBMIT — what the applicant hands over, and what CCRO checks or signs.",
  "PAY — what the cashier collects and issues.",
  "CLAIM — what the applicant receives, and when.",
];

// Every service asks about at least one person; only Marriage License (so far)
// asks about two, so the placeholder reflects the common case. A function, not
// a constant, so each caller gets its own array instance to mutate.
const defaultPartyRoles = () => [{ value: "Subject" }];

const DATE_DIRECTIONS: { value: EventDateDirection; label: string }[] = [
  { value: "past", label: "Past dates only" },
  { value: "future", label: "Future dates only" },
  { value: "any", label: "Any date" },
];

const EMPTY_REQUIREMENT = {
  requirement_name: "",
  where_to_secure: "",
  is_mandatory: true,
  case_tag: "",
};

function emptyDefaults(): FormValues {
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

function serviceDefaults(service: Service): FormValues {
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
    // Filled in once the checklist loads.
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

/**
 * Seeded rows fold the source into the name after an em dash; split it back out
 * so it lands in its own field rather than being re-saved as part of the name.
 */
function toFormRequirement(requirement: ServiceRequirement) {
  const { primary, secondary } = parseRequirementName(
    requirement.requirement_name,
  );
  const hasOwnColumn = Boolean(requirement.where_to_secure);
  return {
    requirement_name: hasOwnColumn ? requirement.requirement_name : primary,
    where_to_secure: requirement.where_to_secure ?? secondary ?? "",
    is_mandatory: requirement.is_mandatory,
    case_tag: requirement.case_tag ?? "",
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  departments: Department[];
  /** Present ⇒ edit that service. Absent ⇒ create a new one. */
  service?: Service | null;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  services,
  departments,
  service = null,
}: ServiceFormDialogProps) {
  const isEdit = service !== null;

  const createMutation = useCreateServiceWithRequirements();
  const updateMutation = useUpdateServiceWithRequirements();
  const mutation = isEdit ? updateMutation : createMutation;

  const [presetCode, setPresetCode] = useState("");
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // The dialog stays mounted across open/close, so a failed attempt would leave
  // a stale banner on the next open unless we scope it to the current session.
  const [submitted, setSubmitted] = useState(false);

  // In edit mode the service keeps its own code — don't flag it as taken.
  const takenCodes = useMemo(
    () =>
      new Set(
        services
          .map((entry) => entry.service_code)
          .filter((code) => code !== service?.service_code),
      ),
    [services, service?.service_code],
  );
  const formSchema = useMemo(() => buildFormSchema(takenCodes), [takenCodes]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: emptyDefaults(),
  });

  const stepFields = useFieldArray({ control: form.control, name: "steps" });
  const partyRoleFields = useFieldArray({
    control: form.control,
    name: "party_roles",
  });
  const requirementFields = useFieldArray({
    control: form.control,
    name: "requirements",
  });

  const { reset } = form;

  // Load the service being edited, plus its checklist, whenever the dialog opens.
  useEffect(() => {
    if (!open) return;

    if (!service) {
      reset(emptyDefaults());
      return;
    }

    reset(serviceDefaults(service));
    let cancelled = false;
    setChecklistLoading(true);

    getServiceChecklist({
      data: {
        service_code: service.service_code,
        requirement_group: service.requirement_group,
      },
    })
      .then((rows) => {
        if (cancelled) return;
        form.setValue("requirements", rows.map(toFormRequirement));
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load this service's checklist.");
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `form` is stable across renders; `reset` is the piece we depend on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service?.service_code, reset]);

  /**
   * Which other services would be affected by a checklist change. Requirements
   * are keyed by `requirement_group`, so variants that share a group share one
   * checklist — editing any of them edits it for all.
   */
  const sharedWith = useMemo(() => {
    if (!service) return [];
    const groupKey = service.requirement_group ?? service.service_code;
    return services.filter(
      (entry) =>
        entry.service_code !== service.service_code &&
        (entry.requirement_group ?? entry.service_code) === groupKey,
    );
  }, [service, services]);

  function closeAndReset() {
    reset(emptyDefaults());
    setPresetCode("");
    setAdvancedOpen(false);
    setSubmitted(false);
    onOpenChange(false);
  }

  /**
   * Prefill a new service from an existing registry entry. The charter services
   * are already seeded, so this doubles as "start from the charter" without
   * keeping a second copy of the charter in TypeScript.
   */
  async function applyPreset(code: string | null) {
    const source = services.find((entry) => entry.service_code === code);
    if (!source || !code) return;

    setPresetCode(code);
    // Deliberately leaves service_code blank — the new service needs its own key.
    form.setValue("name", source.name);
    form.setValue("classification", source.classification ?? "simple");
    form.setValue("fee", String(source.fee ?? 0));
    form.setValue("processing_time", source.processing_time ?? "");
    form.setValue(
      "department_id",
      source.department_id ?? UNASSIGNED_DEPARTMENT_VALUE,
    );
    form.setValue(
      "steps",
      (source.steps_description ?? []).map((value) => ({ value })),
    );
    form.setValue(
      "party_roles",
      source.party_roles?.length
        ? source.party_roles.map((value) => ({ value }))
        : defaultPartyRoles(),
    );
    form.setValue("event_date_label", source.event_date_label ?? "");
    form.setValue("event_place_label", source.event_place_label ?? "");
    form.setValue("event_date_direction", source.event_date_direction);
    form.setValue("reference_number_label", source.reference_number_label ?? "");
    form.setValue("asks_purpose", source.asks_purpose);
    form.setValue("asks_birth_details", source.asks_birth_details);

    setChecklistLoading(true);
    try {
      const rows = await getServiceChecklist({
        data: {
          service_code: source.service_code,
          requirement_group: source.requirement_group,
        },
      });
      form.setValue("requirements", rows.map(toFormRequirement));
    } catch {
      toast.error(
        "Copied the service details, but its checklist could not be loaded.",
      );
    } finally {
      setChecklistLoading(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitted(true);

    const steps = values.steps
      .map((step) => step.value.trim())
      .filter((step) => step.length > 0);

    const partyRoles = values.party_roles
      .map((role) => role.value.trim())
      .filter((role) => role.length > 0);

    const requirements = values.requirements.map((requirement) => ({
      requirement_name: requirement.requirement_name.trim(),
      where_to_secure: requirement.where_to_secure?.trim() || null,
      case_tag: requirement.case_tag?.trim() || null,
      is_mandatory: requirement.is_mandatory,
    }));

    const fields = {
      name: values.name.trim(),
      classification: values.classification,
      fee: Number(values.fee),
      processing_time: values.processing_time.trim(),
      department_id:
        !values.department_id ||
        values.department_id === UNASSIGNED_DEPARTMENT_VALUE
          ? null
          : values.department_id,
      steps_description: steps,
      // Never save zero roles — the intake form needs at least one person block.
      party_roles: partyRoles.length > 0 ? partyRoles : ["Subject"],
      event_date_label: values.event_date_label?.trim() || null,
      event_place_label: values.event_place_label?.trim() || null,
      event_date_direction: values.event_date_direction,
      reference_number_label: values.reference_number_label?.trim() || null,
      asks_purpose: values.asks_purpose,
      asks_birth_details: values.asks_birth_details,
      display_group: values.display_group?.trim() || null,
      display_name: values.display_name?.trim() || null,
      requirement_group: values.requirement_group?.trim() || null,
    };

    const saved = isEdit
      ? await updateMutation.mutate({
          data: {
            service_code: service.service_code,
            updates: fields,
            requirements,
          },
        })
      : await createMutation.mutate({
          data: {
            service_code: values.service_code.trim(),
            ...fields,
            requirements,
          },
        });

    if (saved) closeAndReset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : closeAndReset())}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit service" : "Add service"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? (
              <>
                Update this CCRO service and its checklist. The service code is
                fixed — existing requests reference it.
              </>
            ) : (
              <>
                Register a new CCRO service. Mirror the Citizen&rsquo;s Charter
                entry — classification, total fee, processing time, client
                steps, and the checklist of requirements with where each one is
                secured.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {submitted && mutation.error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Unable to save the service. Please try again."}
            </div>
          )}

          <div className="max-h-[65vh] overflow-y-auto pr-1">
            <FieldGroup>
              {/* ── Start from an existing service (create only) ────────── */}
              {!isEdit && (
                <Field>
                  <FieldLabel htmlFor="service-preset">
                    Start from an existing service{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </FieldLabel>
                  <Select value={presetCode} onValueChange={applyPreset}>
                    <SelectTrigger id="service-preset">
                      <SelectValue placeholder="Copy fields from a charter service">
                        {(value) =>
                          services.find((entry) => entry.service_code === value)
                            ?.name
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {services.map((entry) => (
                          <SelectItem
                            key={entry.service_code}
                            value={entry.service_code}
                          >
                            {entry.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    <span className="flex items-center gap-1.5">
                      <Copy className="size-3" />
                      Copies everything except the service code, which must be
                      unique.
                    </span>
                  </FieldDescription>
                </Field>
              )}

              {/* ── Service details ────────────────────────────────────── */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="service_code"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="service-code">
                        Service Code
                      </FieldLabel>
                      <Input
                        {...field}
                        id="service-code"
                        placeholder="CTC-LOCAL"
                        className="font-mono uppercase"
                        disabled={isEdit}
                        aria-invalid={fieldState.invalid}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : (
                        <FieldDescription>
                          {isEdit
                            ? "Permanent — requests reference this code."
                            : "Permanent identifier. Cannot be changed later."}
                        </FieldDescription>
                      )}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="fee"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="service-fee">Total Fee</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <span aria-hidden="true">&#8369;</span>
                        </InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          id="service-fee"
                          inputMode="decimal"
                          placeholder="100.00"
                          aria-invalid={fieldState.invalid}
                        />
                      </InputGroup>
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : (
                        <FieldDescription>
                          The charter&rsquo;s Total row. Enter 0 if free.
                        </FieldDescription>
                      )}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="service-name">Service Name</FieldLabel>
                    <Input
                      {...field}
                      id="service-name"
                      placeholder="Issuance of Certified True/Xerox Copies of Civil Registry Records"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="classification"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="service-classification">
                        Classification
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="service-classification"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Classification">
                            {(value) =>
                              CLASSIFICATIONS.find((c) => c.value === value)
                                ?.label
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {CLASSIFICATIONS.map((classification) => (
                              <SelectItem
                                key={classification.value}
                                value={classification.value}
                              >
                                {classification.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        {
                          CLASSIFICATIONS.find((c) => c.value === field.value)
                            ?.hint
                        }
                      </FieldDescription>
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="processing_time"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="service-processing-time">
                        Processing Time
                      </FieldLabel>
                      <Input
                        {...field}
                        id="service-processing-time"
                        placeholder="2 hours"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : (
                        <FieldDescription>
                          Include any posting or publication wait.
                        </FieldDescription>
                      )}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="department_id"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="service-department">
                        Handling Department
                      </FieldLabel>
                      <Select
                        value={field.value ?? UNASSIGNED_DEPARTMENT_VALUE}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="service-department"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Unassigned">
                            {(value) =>
                              departments.find((d) => d.id === value)?.name ??
                              "Unassigned"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {departments.map((department) => (
                              <SelectItem
                                key={department.id}
                                value={department.id}
                              >
                                {department.name}
                              </SelectItem>
                            ))}
                            <SelectItem value={UNASSIGNED_DEPARTMENT_VALUE}>
                              Unassigned
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Which CCRO department requests for this service are
                        routed to.
                      </FieldDescription>
                    </Field>
                  )}
                />
              </div>

              {/* ── Client steps ───────────────────────────────────────── */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Client Steps
                  </p>
                  <p className="text-xs text-muted-foreground">
                    What the applicant does at each stage — the charter&rsquo;s
                    SUBMIT / PAY / CLAIM sequence.
                  </p>
                </div>

                {stepFields.fields.map((stepField, index) => (
                  <div key={stepField.id} className="flex items-start gap-2">
                    <span className="mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <Controller
                      control={form.control}
                      name={`steps.${index}.value`}
                      render={({ field }) => (
                        <InputGroup className="flex-1">
                          <InputGroupTextarea
                            {...field}
                            rows={2}
                            placeholder={
                              STEP_PLACEHOLDERS[index] ??
                              "Describe this step for the applicant."
                            }
                          />
                        </InputGroup>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => stepFields.remove(index)}
                      aria-label={`Remove step ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => stepFields.append({ value: "" })}
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Add step
                </Button>
              </div>

              {/* ── Person roles ───────────────────────────────────────── */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Person Roles
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Who this service&rsquo;s intake form asks about. Most
                    services need just one — the record&rsquo;s subject.
                    Marriage License needs two: Bride and Groom.
                  </p>
                </div>

                {partyRoleFields.fields.map((roleField, index) => (
                  <div key={roleField.id} className="flex items-center gap-2">
                    <Controller
                      control={form.control}
                      name={`party_roles.${index}.value`}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Subject"
                          aria-label={`Person role ${index + 1}`}
                        />
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={partyRoleFields.fields.length <= 1}
                      onClick={() => partyRoleFields.remove(index)}
                      aria-label={`Remove person role ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => partyRoleFields.append({ value: "" })}
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Add person role
                </Button>
              </div>

              {/* ── Case details ────────────────────────────────────────── */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Case Details
                  </p>
                  <p className="text-xs text-muted-foreground">
                    How the applicant&rsquo;s case-details step reads for this
                    service. Leave the labels blank to use the generic
                    &ldquo;Date of event&rdquo; / &ldquo;Place of
                    event&rdquo; wording.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="event_date_label"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="service-event-date-label">
                          Date label
                        </FieldLabel>
                        <Input
                          {...field}
                          id="service-event-date-label"
                          placeholder="Date of event"
                        />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="event_place_label"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="service-event-place-label">
                          Place label
                        </FieldLabel>
                        <Input
                          {...field}
                          id="service-event-place-label"
                          placeholder="Place of event"
                        />
                      </Field>
                    )}
                  />
                </div>

                <Controller
                  control={form.control}
                  name="event_date_direction"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="service-event-date-direction">
                        Date direction
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="service-event-date-direction"
                          className="w-full"
                        >
                          <SelectValue>
                            {(value) =>
                              DATE_DIRECTIONS.find((d) => d.value === value)
                                ?.label
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {DATE_DIRECTIONS.map((direction) => (
                              <SelectItem
                                key={direction.value}
                                value={direction.value}
                              >
                                {direction.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Most services register something that already
                        happened. Use &ldquo;Future dates only&rdquo; for a
                        prospective service like Marriage License.
                      </FieldDescription>
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="reference_number_label"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="service-reference-number-label">
                        Reference number label{" "}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id="service-reference-number-label"
                        placeholder="Leave blank to hide this field"
                      />
                      <FieldDescription>
                        Adds an optional field to the case step so staff can
                        start looking up an existing record or case before the
                        applicant&rsquo;s visit, e.g. &ldquo;Registry/OCT
                        number (if known)&rdquo;.
                      </FieldDescription>
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="asks_purpose"
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-foreground">
                        Ask &ldquo;Purpose of request&rdquo;
                        <span className="block text-xs font-normal text-muted-foreground">
                          Only relevant when the applicant is requesting a copy of
                          something that already exists (e.g. CTC). Turn this off
                          for registration/license/correction services — there&rsquo;s
                          no downstream &ldquo;purpose&rdquo; to ask about.
                        </span>
                      </span>
                    </label>
                  )}
                />

                <Controller
                  control={form.control}
                  name="asks_birth_details"
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-foreground">
                        Ask birth-specific details
                        <span className="block text-xs font-normal text-muted-foreground">
                          Adds who the informant is and whether the birth took
                          place at a hospital/clinic or at home. Only turn this on
                          for birth registration services.
                        </span>
                      </span>
                    </label>
                  )}
                />
              </div>

              {/* ── Checklist of requirements ──────────────────────────── */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Checklist of Requirements
                  </p>
                  <p className="text-xs text-muted-foreground">
                    What the applicant must bring, and where to get it. Mark a
                    row &ldquo;If applicable&rdquo; when it only applies to
                    certain cases — those still show on the checklist, flagged.
                  </p>
                </div>

                {sharedWith.length > 0 && (
                  <div className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold">
                        This checklist is shared by{" "}
                        {sharedWith.length + 1} services.
                      </p>
                      <p>
                        Saving changes it for all of them:{" "}
                        {sharedWith.map((entry) => entry.name).join(", ")}. Use
                        the case tag on a row to limit it to one variant, or
                        give this service its own requirement group below.
                      </p>
                    </div>
                  </div>
                )}

                {checklistLoading ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-xs text-muted-foreground">
                    <Spinner className="size-4" />
                    Loading checklist&hellip;
                  </div>
                ) : (
                  <>
                    {requirementFields.fields.map((requirementField, index) => (
                      <div
                        key={requirementField.id}
                        className="space-y-3 rounded-lg border border-border bg-surface-subtle p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Controller
                            control={form.control}
                            name={`requirements.${index}.requirement_name`}
                            render={({ field, fieldState }) => (
                              <Field
                                data-invalid={fieldState.invalid}
                                className="flex-1"
                              >
                                <FieldLabel
                                  htmlFor={`requirement-name-${index}`}
                                >
                                  Requirement {index + 1}
                                </FieldLabel>
                                <Input
                                  {...field}
                                  id={`requirement-name-${index}`}
                                  placeholder="Valid ID, 1 photocopy with signature"
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => requirementFields.remove(index)}
                            aria-label={`Remove requirement ${index + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Controller
                            control={form.control}
                            name={`requirements.${index}.where_to_secure`}
                            render={({ field }) => (
                              <Field>
                                <FieldLabel
                                  htmlFor={`requirement-source-${index}`}
                                >
                                  Where to secure
                                </FieldLabel>
                                <Input
                                  {...field}
                                  id={`requirement-source-${index}`}
                                  placeholder="Government / Private sector"
                                />
                              </Field>
                            )}
                          />

                          <Controller
                            control={form.control}
                            name={`requirements.${index}.is_mandatory`}
                            render={({ field }) => (
                              <Field>
                                <FieldLabel>Applies to</FieldLabel>
                                <RadioGroup
                                  value={
                                    field.value ? "required" : "conditional"
                                  }
                                  onValueChange={(value) =>
                                    field.onChange(value === "required")
                                  }
                                  className="grid-cols-2 gap-2"
                                >
                                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-white px-2.5 py-2 text-xs font-medium">
                                    <RadioGroupItem
                                      value="required"
                                      id={`requirement-required-${index}`}
                                    />
                                    Required
                                  </label>
                                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-white px-2.5 py-2 text-xs font-medium">
                                    <RadioGroupItem
                                      value="conditional"
                                      id={`requirement-conditional-${index}`}
                                    />
                                    If applicable
                                  </label>
                                </RadioGroup>
                              </Field>
                            )}
                          />
                        </div>

                        <Controller
                          control={form.control}
                          name={`requirements.${index}.case_tag`}
                          render={({ field }) => (
                            <Field>
                              <FieldLabel htmlFor={`requirement-case-${index}`}>
                                Case tag{" "}
                                <span className="font-normal text-muted-foreground">
                                  (optional)
                                </span>
                              </FieldLabel>
                              <Input
                                {...field}
                                id={`requirement-case-${index}`}
                                placeholder="marital_only"
                                className="font-mono text-xs"
                              />
                              <FieldDescription>
                                Limits this row to one variant, e.g.
                                marital_only, non_marital_only, brap_only.
                              </FieldDescription>
                            </Field>
                          )}
                        />
                      </div>
                    ))}

                    {requirementFields.fields.length === 0 && (
                      <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                        No requirements yet. Applicants will see an empty
                        checklist for this service.
                      </p>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        requirementFields.append({ ...EMPTY_REQUIREMENT })
                      }
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      Add requirement
                    </Button>
                  </>
                )}
              </div>

              {/* ── Advanced grouping ──────────────────────────────────── */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger className="flex w-full cursor-pointer select-none items-center justify-between border-t border-border pt-4 text-sm font-medium text-muted-foreground hover:text-foreground">
                  Grouping &amp; relationships (optional)
                  <ChevronDown
                    className={`size-4 transition-transform duration-200 ${
                      advancedOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <p className="text-xs text-muted-foreground">
                    Only needed when this service is one variant of a service
                    applicants browse as a single card (e.g. on-time and delayed
                    birth registration). Leave blank for a standalone service —
                    its checklist is then keyed to its own service code.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Controller
                      control={form.control}
                      name="display_group"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="service-display-group">
                            Display Group
                          </FieldLabel>
                          <Input
                            {...field}
                            id="service-display-group"
                            placeholder="birth_ontime"
                            className="font-mono"
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="display_name"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="service-display-name">
                            Display Name
                          </FieldLabel>
                          <Input
                            {...field}
                            id="service-display-name"
                            placeholder="Birth Certificate"
                          />
                        </Field>
                      )}
                    />
                  </div>

                  <Controller
                    control={form.control}
                    name="requirement_group"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="service-requirement-group">
                          Requirement Group
                        </FieldLabel>
                        <Input
                          {...field}
                          id="service-requirement-group"
                          placeholder="Defaults to the service code"
                          className="font-mono"
                        />
                        <FieldDescription>
                          Set this to share one checklist across several service
                          variants.
                        </FieldDescription>
                      </Field>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </FieldGroup>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={closeAndReset}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.status === "pending" || checklistLoading}
            >
              {mutation.status === "pending" ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  {isEdit ? "Saving changes…" : "Creating service…"}
                </span>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create service"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
