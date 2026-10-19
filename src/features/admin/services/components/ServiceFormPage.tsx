import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useLocation, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormProvider,
  useForm,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import {
  ClipboardCheck,
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  FileText,
  GitBranch,
  Link2,
  Route as RouteIcon,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { parseFeeComponents } from "~/features/services/fee-components";
import { formatServiceCode } from "~/features/services/service-utils";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import type { Department } from "~/features/admin/departments.queries";
import type { ConditionRef } from "~/features/forms/form-option-usage";
import { getServiceFormTemplateFn } from "~/features/forms/form-template.functions";
import { formTemplateDefinitionSchema } from "~/features/forms/form-template.types";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import { buildLegacyFormDefinition } from "~/features/forms/form-template.utils";
import { useSaveServiceConfiguration } from "../hooks/useSaveServiceConfiguration";
import { findRequirementIssue } from "../service-configuration.schema";
import { getServiceChecklist } from "../services.queries";
import type { Service } from "../services.types";
import {
  ServiceDossierHeader,
  ServiceEditorSection,
  ServiceFormActionBar,
} from "./ServiceFormChrome";
import { ApplicationFormSection } from "./service-form-sections/ApplicationFormSection";
import { CaseQuestionsSection } from "./service-form-sections/CaseQuestionsSection";
import { CitizenJourneySection } from "./service-form-sections/CitizenJourneySection";
import { RegistryDetailsSection } from "./service-form-sections/RegistryDetailsSection";
import { RemoveWindowRuleButton } from "./service-form-sections/RemoveWindowRuleButton";
import { RelationshipsSection } from "./service-form-sections/RelationshipsSection";
import { RequirementsSection } from "./service-form-sections/RequirementsSection";
import {
  UNASSIGNED_DEPARTMENT_VALUE,
  buildServiceFormSchema,
  defaultPartyRoles,
  emptyServiceFormDefaults,
  genericFormDefinition,
  serviceFormDefaults,
  toFeeComponentPayload,
  toServiceFormRequirement,
  type ServiceFormValues,
} from "./service-form.config";

const EDITOR_SECTION_IDS = [
  "registry-details",
  "citizen-journey",
  "case-questions",
  "application-form",
  "requirements",
  "relationships",
] as const;

type EditorSectionId = (typeof EDITOR_SECTION_IDS)[number];

const EDITOR_TABS = [
  { id: "registry-details", label: "Registry & Fees", icon: FileText },
  { id: "citizen-journey", label: "Citizen Journey", icon: RouteIcon },
  { id: "case-questions", label: "Timing & Routing", icon: GitBranch },
  {
    id: "application-form",
    label: "Application Form",
    icon: SlidersHorizontal,
  },
  { id: "requirements", label: "Requirements", icon: ClipboardCheck },
  { id: "relationships", label: "Relationships", icon: Link2 },
] as const;

const FIELD_ERROR_DESTINATIONS: Partial<
  Record<
    keyof ServiceFormValues,
    { section: EditorSectionId; anchor: string; label: string }
  >
> = {
  service_code: {
    section: "registry-details",
    anchor: "service-code",
    label: "Service Code",
  },
  name: {
    section: "registry-details",
    anchor: "service-name",
    label: "Service Name",
  },
  classification: {
    section: "registry-details",
    anchor: "service-classification",
    label: "Classification",
  },
  fee: {
    section: "registry-details",
    anchor: "service-fee",
    label: "Total Fee",
  },
  fee_components: {
    section: "registry-details",
    anchor: "fee-breakdown-heading",
    label: "Fee Breakdown",
  },
  processing_time: {
    section: "registry-details",
    anchor: "service-processing-time",
    label: "Processing Time",
  },
  department_id: {
    section: "registry-details",
    anchor: "service-department",
    label: "Handling Department",
  },
  steps: {
    section: "citizen-journey",
    anchor: "client-steps-heading",
    label: "Citizen Steps",
  },
  party_roles: {
    section: "citizen-journey",
    anchor: "person-roles-heading",
    label: "Person Roles",
  },
  requirements: {
    section: "requirements",
    anchor: "requirements",
    label: "Requirements",
  },
  display_group: {
    section: "relationships",
    anchor: "service-display-group",
    label: "Display Group",
  },
  display_name: {
    section: "relationships",
    anchor: "service-display-name",
    label: "Display Name",
  },
  short_name: {
    section: "relationships",
    anchor: "service-short-name",
    label: "Short Name",
  },
  requirement_group: {
    section: "relationships",
    anchor: "service-requirement-group",
    label: "Requirement Group",
  },
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function firstErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  ) {
    return (value as { message: string }).message;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    const message = firstErrorMessage(nested);
    if (message) return message;
  }
  return null;
}

function sectionsForErrors(errors: FieldErrors<ServiceFormValues>) {
  const sections = new Set<EditorSectionId>();
  for (const fieldName of Object.keys(errors) as (keyof ServiceFormValues)[]) {
    const destination = FIELD_ERROR_DESTINATIONS[fieldName];
    if (destination) sections.add(destination.section);
  }
  return [...sections];
}

interface ServiceFormPageProps {
  services: Service[];
  departments: Department[];
  onSaved: () => void;
  /** Present means edit that service; absent means create a new one. */
  service?: Service | null;
  /** Restrict a grouped-service edit to this one internal registry record. */
  variantOnly?: boolean;
}

/** Full-page editor and orchestration layer for a service registry dossier. */
export function ServiceFormPage({
  services,
  departments,
  onSaved,
  service = null,
  variantOnly = false,
}: ServiceFormPageProps) {
  const isEdit = service !== null;
  const mutation = useSaveServiceConfiguration();
  const navigate = useNavigate();
  const hash = useLocation({ select: (location) => location.hash });

  const [presetCode, setPresetCode] = useState("");
  const [checklistLoading, setChecklistLoading] = useState(Boolean(service));
  const [templateLoading, setTemplateLoading] = useState(Boolean(service));
  const [templateName, setTemplateName] = useState("Application form");
  const [templateVersion, setTemplateVersion] = useState(0);
  // The published version this editor loaded. Sent back on save so a newer
  // version published by someone else in the meantime is not overwritten.
  const [templateVersionId, setTemplateVersionId] = useState<string | null>(
    null,
  );
  const [templateSharedCodes, setTemplateSharedCodes] = useState<string[]>([]);
  const [publishedFieldKeys, setPublishedFieldKeys] = useState<string[]>([]);
  const [templateDirty, setTemplateDirty] = useState(false);
  const [formDefinition, setFormDefinition] = useState<FormTemplateDefinition>(
    genericFormDefinition,
  );
  const [submitted, setSubmitted] = useState(false);

  const takenCodes = useMemo(
    () =>
      new Set(
        services
          .map((entry) => entry.service_code)
          .filter((code) => code !== service?.service_code),
      ),
    [services, service?.service_code],
  );
  const formSchema = useMemo(
    () => buildServiceFormSchema(takenCodes),
    [takenCodes],
  );
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: service
      ? serviceFormDefaults(service)
      : emptyServiceFormDefaults(),
  });
  // URL fragments are unavailable during SSR. Apply them after hydration so
  // direct links render the same initial tab on the server and client.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { reset } = form;
  const availableTabs = EDITOR_TABS.filter(
    ({ id }) =>
      !variantOnly || (id !== "case-questions" && id !== "application-form"),
  );
  const requestedSection = !hydrated
    ? "registry-details"
    : hash === "timing-routing"
      ? "case-questions"
      : hash;
  const activeSection =
    availableTabs.find(({ id }) => id === requestedSection)?.id ??
    "registry-details";
  const activeTabIndex = availableTabs.findIndex(
    ({ id }) => id === activeSection,
  );
  const previousTab = availableTabs[activeTabIndex - 1];
  const nextTab = availableTabs[activeTabIndex + 1];
  const workspaceRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const keepActiveTabVisible = () => {
      tabListRef.current?.querySelector("[data-active]")?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    };
    keepActiveTabVisible();
    window.addEventListener("resize", keepActiveTabVisible);
    return () => window.removeEventListener("resize", keepActiveTabVisible);
  }, [activeSection]);
  const [
    fee,
    steps,
    partyRoles,
    requirements,
    displayGroup,
    requirementGroup,
  ] = useWatch({
    control: form.control,
    name: [
      "fee",
      "steps",
      "party_roles",
      "requirements",
      "display_group",
      "requirement_group",
    ],
  });

  // Requirement rules point at dropdown options by value; the form editor uses
  // these to lock options that a requirement still depends on.
  const requirementConditions = useMemo<ConditionRef[]>(
    () =>
      (requirements ?? []).flatMap((requirement) =>
        (requirement.applies_when?.conditions ?? []).map((condition) => ({
          field: condition.field,
          value: condition.value,
          where: `Requirement: ${requirement.requirement_name || "Untitled requirement"}`,
        })),
      ),
    [requirements],
  );

  useEffect(() => {
    if (!service) {
      reset(emptyServiceFormDefaults());
      setTemplateDirty(false);
      setTemplateName("Application form");
      setTemplateVersion(0);
      setTemplateVersionId(null);
      setTemplateSharedCodes([]);
      setPublishedFieldKeys([]);
      setFormDefinition(genericFormDefinition());
      return;
    }

    reset(serviceFormDefaults(service));
    setTemplateDirty(false);
    let cancelled = false;
    setChecklistLoading(true);
    setTemplateLoading(true);

    getServiceChecklist({
      data: {
        service_code: service.service_code,
        requirement_group: service.requirement_group,
      },
    })
      .then((rows) => {
        if (cancelled) return;
        reset(
          {
            ...serviceFormDefaults(service),
            requirements: rows.map(toServiceFormRequirement),
          },
          { keepDirtyValues: true },
        );
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Couldn't load this service's checklist. Reload the page to try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false);
      });

    getServiceFormTemplateFn({ data: service.service_code })
      .then((template) => {
        if (cancelled) return;
        setTemplateName(
          template?.templateName ?? `${service.name} application`,
        );
        setTemplateVersion(template?.version ?? 0);
        setTemplateVersionId(template?.versionId ?? null);
        setTemplateSharedCodes(
          template?.sharedServiceCodes ?? [service.service_code],
        );
        setFormDefinition(
          template?.definition ?? buildLegacyFormDefinition(service),
        );
        setPublishedFieldKeys(
          template
            ? [
                ...template.definition.sections.flatMap((section) =>
                  section.fields.map((field) => field.key),
                ),
                ...(template.definition.caseSelector?.questions.map(
                  (question) => question.key,
                ) ?? []),
              ]
            : [],
        );
      })
      .catch(() => {
        if (cancelled) return;
        setFormDefinition(buildLegacyFormDefinition(service));
        setPublishedFieldKeys([]);
        toast.error("Couldn't load this service's application form. Reload the page to try again.");
      })
      .finally(() => {
        if (!cancelled) setTemplateLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `form` is stable across renders; `reset` is the piece we depend on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.service_code, reset]);

  const sharedWith = useMemo(() => {
    if (!service) return [];
    const groupKey = service.requirement_group ?? service.service_code;

    return services.filter(
      (entry) =>
        entry.service_code !== service.service_code &&
        (entry.requirement_group ?? entry.service_code) === groupKey,
    );
  }, [service, services]);

  const caseVariants = useMemo(() => {
    if (!service) return [];
    if (!service.display_group) return [service];
    return services.filter(
      (entry) => entry.display_group === service.display_group,
    );
  }, [service, services]);

  // Every service card an admin can route a timing mismatch to: one entry per
  // display group, plus each standalone service keyed by its own code.
  const timingTargetOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const entry of services) {
      const key = entry.display_group ?? entry.service_code;
      if (options.has(key)) continue;
      options.set(key, entry.display_name ?? entry.name);
    }
    return [...options].map(([value, label]) => ({ value, label }));
  }, [services]);

  function resetEditor() {
    reset(emptyServiceFormDefaults());
    setPresetCode("");
    setSubmitted(false);
    setTemplateName("Application form");
    setTemplateVersion(0);
    setTemplateVersionId(null);
    setTemplateSharedCodes([]);
    setPublishedFieldKeys([]);
    setFormDefinition(genericFormDefinition());
    setTemplateDirty(false);
  }

  const isDirty = form.formState.isDirty || templateDirty || presetCode !== "";
  // Set synchronously right before a post-save navigate() so the blocker
  // sees it immediately. `isDirty` above is only refreshed via `setState`,
  // which hasn't committed yet when navigate() fires right after a save.
  const skipNextBlockRef = useRef(false);
  const blocker = useBlocker({
    enableBeforeUnload: isDirty,
    shouldBlockFn: ({ current, next }) => {
      if (skipNextBlockRef.current) return false;
      return current.pathname !== next.pathname && isDirty;
    },
    withResolver: true,
  });

  async function revealSection(sectionId: EditorSectionId) {
    await navigate({
      hash: sectionId,
      replace: true,
      resetScroll: false,
      hashScrollIntoView: false,
    });
    workspaceRef.current?.scrollTo({ top: 0 });
  }

  async function focusErrorDestination(
    sectionId: EditorSectionId,
    anchor: string,
  ) {
    await revealSection(sectionId);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(anchor);
      target?.scrollIntoView({ block: "center" });
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLSelectElement
      ) {
        target.focus({ preventScroll: true });
      }
    });
  }

  async function onInvalid(errors: FieldErrors<ServiceFormValues>) {
    setSubmitted(true);
    const invalidSectionIds = sectionsForErrors(errors);
    if (invalidSectionIds[0]) await revealSection(invalidSectionIds[0]);
    window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
  }

  async function applyPreset(code: string | null) {
    const source = services.find((entry) => entry.service_code === code);
    if (!source || !code) return;

    setPresetCode(code);
    setTemplateDirty(true);
    form.setValue("name", source.name);
    form.setValue("classification", source.classification ?? "simple");
    form.setValue("fee", String(source.fee ?? 0));
    form.setValue("fee_per_copy", source.fee_per_copy ?? false);
    form.setValue(
      "fee_components",
      parseFeeComponents(source.fee_components).map((component) => ({
        label: component.label,
        amount: String(component.amount),
        included: component.included,
        unit: component.unit ?? "",
        note: component.note ?? "",
      })),
    );
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
    form.setValue(
      "reference_number_label",
      source.reference_number_label ?? "",
    );
    form.setValue("asks_purpose", source.asks_purpose);
    form.setValue("asks_birth_details", source.asks_birth_details);

    setTemplateLoading(true);
    try {
      const template = await getServiceFormTemplateFn({
        data: source.service_code,
      });
      setTemplateName(`${source.name} application`);
      setTemplateVersion(0);
      setTemplateVersionId(null);
      setTemplateSharedCodes([]);
      setPublishedFieldKeys([]);
      const sourceDefinition =
        template?.definition ?? buildLegacyFormDefinition(source);
      setFormDefinition({ ...sourceDefinition, caseSelector: undefined });
    } catch {
      setFormDefinition(buildLegacyFormDefinition(source));
      toast.error(
        "Service details copied, but the application form didn't load. The form shows a default template instead.",
      );
    } finally {
      setTemplateLoading(false);
    }

    setChecklistLoading(true);
    try {
      const rows = await getServiceChecklist({
        data: {
          service_code: source.service_code,
          requirement_group: source.requirement_group,
        },
      });
      // The copied rows still belong to the source service; here they are new.
      form.setValue(
        "requirements",
        rows.map((row) => ({
          ...toServiceFormRequirement(row),
          requirement_id: undefined,
        })),
      );
    } catch {
      toast.error(
        "Service details copied, but the checklist didn't load. Add the requirements manually.",
      );
    } finally {
      setChecklistLoading(false);
    }
  }

  async function onSubmit(values: ServiceFormValues) {
    setSubmitted(true);

    const parsedDefinition =
      formTemplateDefinitionSchema.safeParse(formDefinition);
    if (!parsedDefinition.success) {
      revealSection("application-form");
      toast.error(
        parsedDefinition.error.issues[0]?.message ??
          "Fix the errors in the application form, then publish again.",
      );
      return;
    }

    const caseSelector = parsedDefinition.data.caseSelector;
    if (caseSelector && !variantOnly) {
      const expectedCodes = new Set(
        caseVariants.map((variant) => variant.service_code),
      );
      const mappedCodes = new Set(
        caseSelector.outcomes.map((outcome) => outcome.serviceCode),
      );
      if (
        expectedCodes.size !== mappedCodes.size ||
        [...expectedCodes].some((code) => !mappedCodes.has(code))
      ) {
        revealSection("case-questions");
        toast.error("Map every internal variant before publishing.");
        return;
      }
    }

    const eventTiming = parsedDefinition.data.eventTiming;
    if (eventTiming && !variantOnly) {
      const targetExists = timingTargetOptions.some(
        (option) => option.value === eventTiming.targetServiceCode,
      );
      if (!targetExists) {
        revealSection("case-questions");
        toast.error(
          "Choose an Alternate Service Track for the window rule.",
        );
        return;
      }
    }

    const requirementIssue = findRequirementIssue(
      parsedDefinition.data,
      values.requirements,
      values.party_roles.map((role) => role.value),
    );
    if (requirementIssue) {
      revealSection("requirements");
      toast.error(requirementIssue);
      return;
    }

    const steps = values.steps
      .map((step) => step.value.trim())
      .filter((step) => step.length > 0);
    const partyRoles = values.party_roles
      .map((role) => role.value.trim())
      .filter((role) => role.length > 0);
    const requirements = values.requirements.map((requirement) => ({
      id: requirement.requirement_id ?? null,
      requirement_name: requirement.requirement_name.trim(),
      where_to_secure: requirement.where_to_secure?.trim() || null,
      case_tag: requirement.case_tag?.trim() || null,
      applies_when: requirement.applies_when,
      is_mandatory: requirement.is_mandatory,
      requires_upload: requirement.requires_upload,
      upload_scope: requirement.requires_upload
        ? requirement.upload_scope
        : "request",
      subject_role:
        requirement.requires_upload &&
        requirement.upload_scope === "specific_subject"
          ? requirement.subject_role?.trim() || null
          : null,
    }));
    // The case labels are edited as fields in the Application Form; the
    // registry columns only cache them for the reports. Refresh the cache from
    // the form being saved. A variant save carries no form, and a form that
    // lacks the date or place field keeps the stored label, so neither wipes it.
    const caseFields = new Map(
      parsedDefinition.data.sections
        .flatMap((section) => section.fields)
        .map((field) => [field.key, field]),
    );
    const eventDate = caseFields.get("event_date");
    const caseLabels = variantOnly
      ? {
          event_date_label: values.event_date_label?.trim() || null,
          event_place_label: values.event_place_label?.trim() || null,
          event_date_direction: values.event_date_direction,
          reference_number_label: values.reference_number_label?.trim() || null,
        }
      : {
          event_date_label:
            eventDate?.label.trim() || values.event_date_label?.trim() || null,
          event_place_label:
            caseFields.get("event_place")?.label.trim() ||
            values.event_place_label?.trim() ||
            null,
          event_date_direction:
            eventDate?.dateDirection ?? values.event_date_direction,
          reference_number_label:
            caseFields.get("reference_number")?.label.trim() || null,
        };
    const fields = {
      name: values.name.trim(),
      classification: values.classification,
      fee: Number(values.fee),
      fee_components: toFeeComponentPayload(values.fee_components),
      processing_time: values.processing_time.trim(),
      department_id:
        !values.department_id ||
        values.department_id === UNASSIGNED_DEPARTMENT_VALUE
          ? null
          : values.department_id,
      steps_description: steps,
      party_roles: partyRoles.length > 0 ? partyRoles : ["Subject"],
      ...caseLabels,
      asks_purpose: values.asks_purpose,
      asks_birth_details: values.asks_birth_details,
      allows_messages: values.allows_messages,
      fee_per_copy: values.fee_per_copy,
      display_group: values.display_group?.trim() || null,
      display_name: values.display_name?.trim() || null,
      short_name: values.short_name?.trim() || null,
      requirement_group: values.requirement_group?.trim() || null,
    };

    // One call, one transaction: the registry row, the checklist, and the form
    // are saved together or not at all.
    const saved = await mutation.mutate({
      data: {
        mode: isEdit ? "update" : "create",
        serviceCode: isEdit ? service.service_code : values.service_code.trim(),
        service: fields,
        requirements,
        form: variantOnly
          ? null
          : {
              templateName:
                templateName.trim() || `${values.name.trim()} application`,
              definition: parsedDefinition.data,
              expectedVersionId: templateVersionId,
            },
      },
    });

    if (!saved) return;

    toast.success(
      variantOnly
        ? "Variant record saved."
        : !isEdit
          ? "Service created and application form published."
          : saved.form?.published
            ? "Service and application form published."
            : "Service saved. The application form is unchanged.",
    );
    skipNextBlockRef.current = true;
    resetEditor();
    onSaved();
  }

  const isSaving = mutation.status === "pending" || form.formState.isSubmitting;
  const isSubmitDisabled = isSaving || checklistLoading || templateLoading;
  const errorSummary = useMemo(() => {
    if (!submitted) return [];

    return (
      Object.entries(form.formState.errors) as [
        keyof ServiceFormValues,
        unknown,
      ][]
    ).flatMap(([fieldName, error]) => {
      const destination = FIELD_ERROR_DESTINATIONS[fieldName];
      const message = firstErrorMessage(error);
      return destination && message
        ? [{ ...destination, message, fieldName }]
        : [];
    });
  }, [form.formState.errors, submitted]);
  const invalidSections = new Set(errorSummary.map(({ section }) => section));
  const journeySummary = `${steps?.filter((step) => step.value.trim()).length ?? 0} steps · ${partyRoles?.filter((role) => role.value.trim()).length ?? 0} roles`;
  const caseRuleCount =
    Number(Boolean(formDefinition.caseSelector)) +
    Number(Boolean(formDefinition.eventTiming));
  const applicationFieldCount = formDefinition.sections.reduce(
    (count, section) => count + section.fields.length,
    0,
  );
  const relationshipCount = [displayGroup, requirementGroup].filter((value) =>
    value?.trim(),
  ).length;
  const requirementCount = requirements?.length ?? 0;
  const caseSummary =
    caseRuleCount > 0
      ? `${caseRuleCount} rule ${caseRuleCount === 1 ? "set" : "sets"}`
      : "No rules";
  const applicationSummary = `${applicationFieldCount} ${applicationFieldCount === 1 ? "field" : "fields"}`;
  const requirementsSummary = `${requirementCount} ${requirementCount === 1 ? "requirement" : "requirements"}`;
  const relationshipsSummary =
    relationshipCount > 0
      ? `${relationshipCount} ${relationshipCount === 1 ? "link" : "links"}`
      : "Standalone service";

  // Short per-tab counts. Optional sections stay blank until they hold
  // something, so an empty tab is not made to look like missing work.
  const tabCounts: Record<EditorSectionId, string | null> = {
    "registry-details": pesoFormatter.format(Number(fee) || 0),
    "citizen-journey": journeySummary,
    "case-questions":
      caseRuleCount > 0
        ? `${caseRuleCount} ${caseRuleCount === 1 ? "rule" : "rules"}`
        : null,
    "application-form": applicationSummary,
    requirements: String(requirementCount),
    relationships: relationshipCount > 0 ? relationshipsSummary : null,
  };

  return (
    <div
      className="flex h-dvh min-h-0 w-full flex-col overflow-hidden"
      data-service-editor
    >
      <FormProvider {...form}>
        <form
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        >
          <ServiceDossierHeader
            isEdit={isEdit}
            serviceCode={service?.service_code ?? "NEW SERVICE"}
            serviceName={service?.name}
            applicationVersion={templateVersion}
            applicationLoading={templateLoading}
            mode={variantOnly ? "variant" : "full"}
            displayGroup={service?.display_group}
          >
            <ServiceFormActionBar
              isEdit={isEdit}
              isSaving={isSaving}
              isDisabled={isSubmitDisabled}
              isDirty={isDirty}
              mode={variantOnly ? "variant" : "full"}
              displayGroup={service?.display_group}
            />
          </ServiceDossierHeader>
          <Tabs
            value={activeSection}
            onValueChange={(value) => {
              const tab = availableTabs.find(({ id }) => id === value);
              if (tab) void revealSection(tab.id);
            }}
            className="min-h-0 min-w-0 flex-1 gap-0"
          >
            <div className="shrink-0 border-b border-border bg-background px-4 pb-3 sm:px-8">
              <TabsList
                ref={tabListRef}
                variant="segmented"
                aria-label="Service configuration"
              >
                {availableTabs.map(({ id, label, icon: Icon }) => (
                  <TabsTrigger key={id} value={id} className="group/tab gap-2">
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                    {invalidSections.has(id) ? (
                      <CircleAlert
                        aria-label="Needs attention"
                        className="text-destructive"
                      />
                    ) : tabCounts[id] ? (
                      // The active tab always shows its count from `sm` up;
                      // the others join once the bar is wide enough for all
                      // six (an approximation, not a measurement).
                      <span className="hidden text-xs font-normal tabular-nums text-muted-foreground sm:group-data-[active]/tab:inline 2xl:inline">
                        {tabCounts[id]}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div
              ref={workspaceRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8"
              data-editor-workspace
            >
              {/* One width for every section, so the card does not resize as
                  you move between steps. */}
              <div className="mx-auto flex w-full min-w-0 max-w-[920px] flex-col gap-6">
                {submitted && mutation.error ? (
                  <Alert variant="destructive" role="alert">
                    <AlertTitle>Service Not Saved</AlertTitle>
                    <AlertDescription>
                      {mutation.error instanceof Error
                        ? mutation.error.message
                        : "Unable to save the service. Check your connection and try again."}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {errorSummary.length > 0 ? (
                  <div
                    ref={errorSummaryRef}
                    tabIndex={-1}
                    className="scroll-mt-6 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Alert variant="destructive" role="alert">
                      <AlertTitle>
                        Fix {errorSummary.length}{" "}
                        {errorSummary.length === 1 ? "Field" : "Fields"} Before
                        Saving
                      </AlertTitle>
                      <AlertDescription>
                        <ul className="flex list-disc flex-col gap-1 pl-4">
                          {errorSummary.map((error) => (
                            <li key={String(error.fieldName)}>
                              <a
                                href={`#${error.anchor}`}
                                className="font-medium underline underline-offset-4"
                                onClick={(event) => {
                                  event.preventDefault();
                                  focusErrorDestination(
                                    error.section,
                                    error.anchor,
                                  );
                                }}
                              >
                                {error.label}: {error.message}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : null}

                {variantOnly ? (
                  <Alert variant="default">
                    <AlertDescription>
                      You are editing only{" "}
                      <strong>
                        {service ? formatServiceCode(service.service_code) : ""}
                      </strong>
                      . Registry changes stay on this variant; Requirements
                      identifies shared checklist items. Applicant questions and
                      routing remain at the service-group level.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <ServiceEditorSection
                  id="registry-details"
                  icon={FileText}
                  title="Registry & Fees"
                  description="What applicants and the cashier see for this service."
                  hasError={invalidSections.has("registry-details")}
                >
                  <RegistryDetailsSection
                    embedded
                    services={services}
                    departments={departments}
                    isEdit={isEdit}
                    presetCode={presetCode}
                    onPresetChange={applyPreset}
                  />
                </ServiceEditorSection>

                <ServiceEditorSection
                  id="citizen-journey"
                  icon={RouteIcon}
                  title="Citizen Journey"
                  description="What applicants are told to do, and who the application is about."
                  hasError={invalidSections.has("citizen-journey")}
                >
                  <CitizenJourneySection embedded />
                </ServiceEditorSection>

                {!variantOnly ? (
                  <ServiceEditorSection
                    id="case-questions"
                    icon={GitBranch}
                    title="Timing & Routing"
                    description="Send applicants to the right track when their event date falls outside the on-time window."
                    summary={caseSummary}
                    hasError={invalidSections.has("case-questions")}
                    action={
                      formDefinition.eventTiming ? (
                        <RemoveWindowRuleButton
                          onRemove={() => {
                            setFormDefinition({
                              ...formDefinition,
                              eventTiming: undefined,
                            });
                            setTemplateDirty(true);
                          }}
                        />
                      ) : undefined
                    }
                  >
                    <CaseQuestionsSection
                      embedded
                      variants={caseVariants}
                      formDefinition={formDefinition}
                      publishedFieldKeys={publishedFieldKeys}
                      targetOptions={timingTargetOptions}
                      currentServiceCode={
                        service
                          ? (service.display_group ?? service.service_code)
                          : null
                      }
                      onFormDefinitionChange={(definition) => {
                        setFormDefinition(definition);
                        setTemplateDirty(true);
                      }}
                    />
                  </ServiceEditorSection>
                ) : null}

                {!variantOnly ? (
                  <ServiceEditorSection
                    id="application-form"
                    icon={SlidersHorizontal}
                    title="Application Form"
                    description={`Add the questions applicants answer, and show follow-up questions based on earlier answers. Each save publishes a new version, and published versions can’t be edited${templateVersion > 0 ? ` after version ${templateVersion}` : ""}.`}
                    headerDivider={false}
                    summary={applicationSummary}
                    hasError={invalidSections.has("application-form")}
                  >
                    <ApplicationFormSection
                      embedded
                      templateName={templateName}
                      templateVersion={templateVersion}
                      templateSharedCodes={templateSharedCodes}
                      publishedFieldKeys={publishedFieldKeys}
                      formDefinition={formDefinition}
                      externalConditions={requirementConditions}
                      isLoading={templateLoading}
                      onTemplateNameChange={(name) => {
                        setTemplateName(name);
                        setTemplateDirty(true);
                      }}
                      onFormDefinitionChange={(definition) => {
                        setFormDefinition(definition);
                        setTemplateDirty(true);
                      }}
                    />
                  </ServiceEditorSection>
                ) : null}

                <ServiceEditorSection
                  id="requirements"
                  icon={ClipboardCheck}
                  title="Requirements"
                  summary={requirementsSummary}
                  hasError={invalidSections.has("requirements")}
                >
                  <RequirementsSection
                    embedded
                    isLoading={checklistLoading || templateLoading}
                    sharedWith={sharedWith}
                    formDefinition={formDefinition}
                    currentServiceCode={service?.service_code ?? null}
                    variantCodes={caseVariants.map(
                      (variant) => variant.service_code,
                    )}
                  />
                </ServiceEditorSection>

                <ServiceEditorSection
                  id="relationships"
                  icon={Link2}
                  title="Relationships"
                  summary={relationshipsSummary}
                  hasError={invalidSections.has("relationships")}
                >
                  <RelationshipsSection embedded />
                </ServiceEditorSection>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Section {activeTabIndex + 1} of {availableTabs.length}
                  </p>
                  <div className="ml-auto flex items-center gap-2">
                    {previousTab ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => void revealSection(previousTab.id)}
                      >
                        <ArrowLeft
                          aria-hidden="true"
                          data-icon="inline-start"
                        />
                        Previous
                      </Button>
                    ) : null}
                    {nextTab ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => void revealSection(nextTab.id)}
                      >
                        <span className="sm:hidden">Next section</span>
                        <span className="hidden sm:inline">
                          {nextTab.label}
                        </span>
                        <ArrowRight aria-hidden="true" data-icon="inline-end" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </Tabs>
        </form>
      </FormProvider>

      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.status === "blocked") blocker.reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              If you leave the service editor now, your unsaved changes will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={blocker.proceed}>
              Discard and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
