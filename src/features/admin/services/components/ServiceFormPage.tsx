import { useEffect, useMemo, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "~/components/ui/alert";
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
import { FieldGroup } from "~/components/ui/field";
import type { Department } from "~/features/admin/departments.queries";
import {
  getServiceFormTemplateFn,
  publishServiceFormTemplateFn,
} from "~/features/forms/form-template.functions";
import { formTemplateDefinitionSchema } from "~/features/forms/form-template.types";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import { buildLegacyFormDefinition } from "~/features/forms/form-template.utils";
import { useCreateServiceWithRequirements } from "../hooks/useCreateServiceWithRequirements";
import { useUpdateServiceWithRequirements } from "../hooks/useUpdateServiceWithRequirements";
import { getServiceChecklist } from "../services.queries";
import type { Service } from "../services.types";
import {
  ServiceDossierHeader,
  ServiceFormSidebar,
} from "./ServiceFormChrome";
import { ApplicationFormSection } from "./service-form-sections/ApplicationFormSection";
import { CaseQuestionsSection } from "./service-form-sections/CaseQuestionsSection";
import { CitizenJourneySection } from "./service-form-sections/CitizenJourneySection";
import { RegistryDetailsSection } from "./service-form-sections/RegistryDetailsSection";
import { RelationshipsSection } from "./service-form-sections/RelationshipsSection";
import { RequirementsSection } from "./service-form-sections/RequirementsSection";
import {
  UNASSIGNED_DEPARTMENT_VALUE,
  buildServiceFormSchema,
  defaultPartyRoles,
  emptyServiceFormDefaults,
  genericFormDefinition,
  serviceFormDefaults,
  toServiceFormRequirement,
  type ServiceFormValues,
} from "./service-form.config";

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
  const createMutation = useCreateServiceWithRequirements();
  const updateMutation = useUpdateServiceWithRequirements();
  const mutation = isEdit ? updateMutation : createMutation;

  const [presetCode, setPresetCode] = useState("");
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateName, setTemplateName] = useState("Application form");
  const [templateVersion, setTemplateVersion] = useState(0);
  const [templateSharedCodes, setTemplateSharedCodes] = useState<string[]>([]);
  const [publishedFieldKeys, setPublishedFieldKeys] = useState<string[]>([]);
  const [templateDirty, setTemplateDirty] = useState(false);
  const [formDefinition, setFormDefinition] =
    useState<FormTemplateDefinition>(genericFormDefinition);
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
    defaultValues: emptyServiceFormDefaults(),
  });
  const { reset } = form;

  useEffect(() => {
    if (!service) {
      reset(emptyServiceFormDefaults());
      setTemplateDirty(false);
      setTemplateName("Application form");
      setTemplateVersion(0);
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
        form.setValue(
          "requirements",
          rows.map(toServiceFormRequirement),
        );
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load this service's checklist.");
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
        toast.error("Could not load this service's application form.");
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

  function resetEditor() {
    reset(emptyServiceFormDefaults());
    setPresetCode("");
    setSubmitted(false);
    setTemplateName("Application form");
    setTemplateVersion(0);
    setTemplateSharedCodes([]);
    setPublishedFieldKeys([]);
    setFormDefinition(genericFormDefinition());
    setTemplateDirty(false);
  }

  const isDirty = form.formState.isDirty || templateDirty || presetCode !== "";
  const blocker = useBlocker({
    enableBeforeUnload: isDirty,
    shouldBlockFn: ({ current, next }) => {
      return current.pathname !== next.pathname && isDirty;
    },
    withResolver: true,
  });

  async function applyPreset(code: string | null) {
    const source = services.find((entry) => entry.service_code === code);
    if (!source || !code) return;

    setPresetCode(code);
    setTemplateDirty(true);
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
      setTemplateSharedCodes([]);
      setPublishedFieldKeys([]);
      const sourceDefinition =
        template?.definition ?? buildLegacyFormDefinition(source);
      setFormDefinition({ ...sourceDefinition, caseSelector: undefined });
    } catch {
      setFormDefinition(buildLegacyFormDefinition(source));
      toast.error(
        "Copied the service, but its application form could not be loaded.",
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
      form.setValue("requirements", rows.map(toServiceFormRequirement));
    } catch {
      toast.error(
        "Copied the service details, but its checklist could not be loaded.",
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
      toast.error(
        parsedDefinition.error.issues[0]?.message ??
          "Check the application form fields.",
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
        toast.error("Map every internal variant before publishing.");
        return;
      }
    }

    const conditionSources = new Map(
      [
        ...(parsedDefinition.data.caseSelector?.questions ?? []),
        ...(parsedDefinition.data.derivedAnswers ?? []).map((derived) => ({
          key: derived.key,
          options: derived.bands.map((band) => ({
            value: band.value,
            label: band.label,
          })),
        })),
        ...parsedDefinition.data.sections.flatMap((section) =>
          section.fields.filter((field) => field.type === "select"),
        ),
      ].map((source) => [source.key, source] as const),
    );
    for (const [requirementIndex, requirement] of values.requirements.entries()) {
      if (
        requirement.requires_upload &&
        requirement.upload_scope === "specific_subject" &&
        !values.party_roles.some(
          (role) => role.value.trim() === requirement.subject_role?.trim(),
        )
      ) {
        toast.error(
          `Choose a valid person for requirement ${requirementIndex + 1}.`,
        );
        return;
      }
      for (const condition of requirement.applies_when?.conditions ?? []) {
        const source = conditionSources.get(condition.field);
        if (!source) {
          toast.error(
            `Requirement ${requirementIndex + 1} uses a question that no longer exists.`,
          );
          return;
        }
        if (
          source.options?.length &&
          !source.options.some((option) => option.value === condition.value)
        ) {
          toast.error(
            `Requirement ${requirementIndex + 1} uses an answer that no longer exists.`,
          );
          return;
        }
      }
    }

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

    if (!saved) return;

    if (!variantOnly) {
      try {
        await publishServiceFormTemplateFn({
          data: {
            serviceCode: isEdit
              ? service.service_code
              : values.service_code.trim(),
            templateName:
              templateName.trim() || `${values.name.trim()} application`,
            definition: parsedDefinition.data,
          },
        });
      } catch (error) {
        toast.error(
          "The service was saved, but its application form was not published.",
          { description: error instanceof Error ? error.message : undefined },
        );
        return;
      }
    }

    toast.success(
      variantOnly
        ? "Variant record saved."
        : isEdit
        ? "Service and application form published."
        : "Service created and application form published.",
    );
    resetEditor();
    onSaved();
  }

  const isSaving =
    mutation.status === "pending" || form.formState.isSubmitting;
  const isSubmitDisabled =
    isSaving || checklistLoading || templateLoading;

  return (
    <div className="dashboard-page max-w-7xl">
      <ServiceDossierHeader
        isEdit={isEdit}
        serviceCode={service?.service_code ?? "NEW SERVICE"}
        mode={variantOnly ? "variant" : "full"}
        displayGroup={service?.display_group}
      />

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <main className="min-w-0">
              {submitted && mutation.error ? (
                <Alert variant="destructive" className="mb-6" role="alert">
                  <AlertDescription>
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : "Unable to save the service. Please try again."}
                  </AlertDescription>
                </Alert>
              ) : null}

              {variantOnly ? (
                <Alert variant="default" className="mb-6">
                  <AlertDescription>
                    You are editing only <strong>{service?.service_code}</strong>.
                    Registry changes stay on this variant; the Requirements
                    section warns when its checklist is shared. The applicant
                    application and routing rules are managed at the group level.
                  </AlertDescription>
                </Alert>
              ) : null}

              <FieldGroup className="gap-6">
                <RegistryDetailsSection
                  services={services}
                  departments={departments}
                  isEdit={isEdit}
                  presetCode={presetCode}
                  onPresetChange={applyPreset}
                />
                <CitizenJourneySection />
                {!variantOnly ? (
                  <>
                    <CaseQuestionsSection
                      variants={caseVariants}
                      formDefinition={formDefinition}
                      publishedFieldKeys={publishedFieldKeys}
                      onFormDefinitionChange={(definition) => {
                        setFormDefinition(definition);
                        setTemplateDirty(true);
                      }}
                    />
                    <ApplicationFormSection
                      templateName={templateName}
                      templateVersion={templateVersion}
                      templateSharedCodes={templateSharedCodes}
                      publishedFieldKeys={publishedFieldKeys}
                      formDefinition={formDefinition}
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
                  </>
                ) : null}
                <RequirementsSection
                  isLoading={checklistLoading}
                  sharedWith={sharedWith}
                  formDefinition={formDefinition}
                />
                <RelationshipsSection />
              </FieldGroup>
            </main>

            <ServiceFormSidebar
              isEdit={isEdit}
              isSaving={isSaving}
              isDisabled={isSubmitDisabled}
              mode={variantOnly ? "variant" : "full"}
              displayGroup={service?.display_group}
            />
          </div>
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
              If you leave the service editor now, your unsaved changes will
              be lost.
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
