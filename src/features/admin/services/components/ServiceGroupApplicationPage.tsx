import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, GitBranch, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Tabs } from "~/components/ui/tabs";
import { DiscardChangesDialog } from "~/components/feedback/DiscardChangesDialog";
import {
  ServiceDossierHeader,
  ServiceEditorSection,
  ServiceEditorTabBar,
  ServiceFormActionBar,
} from "./ServiceFormChrome";
import {
  ApplicationFormSection,
  applicationFormDescription,
} from "./service-form-sections/ApplicationFormSection";
import {
  CaseQuestionsSection,
  timingRoutingDescription,
} from "./service-form-sections/CaseQuestionsSection";
import {
  getServiceFormTemplateFn,
  publishServiceFormTemplateFn,
} from "~/features/forms/form-template.functions";
import {
  formTemplateDefinitionSchema,
  type FormTemplateDefinition,
} from "~/features/forms/form-template.types";
import { buildLegacyFormDefinition } from "~/features/forms/form-template.utils";
import { formatServiceCode } from "~/features/services/service-utils";
import type { Service } from "../services.types";

const SECTIONS = [
  { id: "variant-routing", label: "Timing & Routing", icon: GitBranch },
  { id: "application-form", label: "Application Form", icon: SlidersHorizontal },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function publishedKeys(definition: FormTemplateDefinition) {
  return [
    ...definition.sections.flatMap((section) =>
      section.fields.map((field) => field.key),
    ),
    ...(definition.caseSelector?.questions.map((question) => question.key) ?? []),
  ];
}

export function ServiceGroupApplicationPage({
  variants,
  targetOptions,
}: {
  variants: Service[];
  targetOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const orderedVariants = useMemo(
    () =>
      [...variants].sort((left, right) =>
        left.service_code.localeCompare(right.service_code),
      ),
    [variants],
  );
  const representative = orderedVariants[0];
  const groupKey = representative.display_group!;
  const displayName = representative.display_name ?? groupKey;

  const [activeSection, setActiveSection] = useState<SectionId>("variant-routing");
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [templateName, setTemplateName] = useState("Application form");
  const [templateVersion, setTemplateVersion] = useState(0);
  const [templateVersionId, setTemplateVersionId] = useState<string | null>(
    null,
  );
  const [templateSharedCodes, setTemplateSharedCodes] = useState<string[]>([]);
  const [immutableKeys, setImmutableKeys] = useState<string[]>([]);
  const [definition, setDefinition] = useState<FormTemplateDefinition>(() =>
    buildLegacyFormDefinition(representative),
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getServiceFormTemplateFn({ data: representative.service_code })
      .then((template) => {
        if (cancelled) return;
        const nextDefinition =
          template?.definition ?? buildLegacyFormDefinition(representative);
        setDefinition(nextDefinition);
        setTemplateName(
          template?.templateName ?? `${displayName} application`,
        );
        setTemplateVersion(template?.version ?? 0);
        setTemplateVersionId(template?.versionId ?? null);
        setTemplateSharedCodes(
          template?.sharedServiceCodes ??
            orderedVariants.map((variant) => variant.service_code),
        );
        setImmutableKeys(template ? publishedKeys(nextDefinition) : []);
        setIsDirty(false);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load the shared application form.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [displayName, orderedVariants, representative]);

  // This page and the group overview share a pathname and differ only by
  // `?scope=application`, so leaving for the overview has to compare it too.
  const blocker = useBlocker({
    enableBeforeUnload: isDirty,
    shouldBlockFn: ({ current, next }) =>
      isDirty &&
      (current.pathname !== next.pathname ||
        (current.search as { scope?: string }).scope !==
          (next.search as { scope?: string }).scope),
    withResolver: true,
  });

  function showSection(id: SectionId) {
    setActiveSection(id);
    workspaceRef.current?.scrollTo({ top: 0 });
  }

  function updateDefinition(nextDefinition: FormTemplateDefinition) {
    setDefinition(nextDefinition);
    setIsDirty(true);
  }

  async function publish() {
    const parsed = formTemplateDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      showSection("application-form");
      toast.error(
        parsed.error.issues[0]?.message ??
          "Fix the errors in the application form, then publish again.",
      );
      return;
    }

    const expectedCodes = new Set(
      orderedVariants.map((variant) => variant.service_code),
    );
    const mappedCodes = new Set(
      parsed.data.caseSelector?.outcomes.map((outcome) => outcome.serviceCode) ??
        [],
    );
    if (
      !parsed.data.caseSelector ||
      expectedCodes.size !== mappedCodes.size ||
      [...expectedCodes].some((code) => !mappedCodes.has(code))
    ) {
      showSection("variant-routing");
      toast.error("Map every internal variant before publishing.");
      return;
    }

    const eventTiming = parsed.data.eventTiming;
    if (
      eventTiming &&
      !targetOptions.some(
        (option) => option.value === eventTiming.targetServiceCode,
      )
    ) {
      showSection("variant-routing");
      toast.error("Choose an Alternate Service Track for the window rule.");
      return;
    }

    setIsSaving(true);
    try {
      const published = await publishServiceFormTemplateFn({
        data: {
          serviceCode: representative.service_code,
          templateName:
            templateName.trim() || `${displayName} application`,
          definition: parsed.data,
          expectedVersionId: templateVersionId,
        },
      });
      setTemplateVersion(published.version);
      setTemplateVersionId(published.versionId);
      setImmutableKeys(publishedKeys(parsed.data));
      setIsDirty(false);
      await router.invalidate();
      if (published.published) {
        toast.success("Shared application published.", {
          description: `Version ${published.version} now applies to all ${orderedVariants.length} variants.`,
        });
      } else {
        toast.success("Shared application saved.", {
          description: `The questions are unchanged, so version ${published.version} stays active.`,
        });
      }
    } catch (error) {
      toast.error("Could not publish the shared application.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  const activeIndex = SECTIONS.findIndex(({ id }) => id === activeSection);
  const previousSection = SECTIONS[activeIndex - 1];
  const nextSection = SECTIONS[activeIndex + 1];
  const ruleCount =
    Number(Boolean(definition.caseSelector)) +
    Number(Boolean(definition.eventTiming));
  const routingSummary =
    ruleCount > 0
      ? `${ruleCount} rule ${ruleCount === 1 ? "set" : "sets"}`
      : "Routing needed";
  const fieldCount = definition.sections.reduce(
    (count, section) => count + section.fields.length,
    0,
  );
  const applicationSummary = `${fieldCount} ${fieldCount === 1 ? "field" : "fields"}`;

  return (
    <div
      className="flex h-dvh min-h-0 w-full flex-col overflow-hidden"
      data-service-editor
    >
      <form
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void publish();
        }}
      >
        <ServiceDossierHeader
          isEdit
          serviceCode=""
          serviceName={displayName}
          applicationVersion={templateVersion}
          applicationLoading={isLoading}
          mode="group"
          displayGroup={groupKey}
        >
          <ServiceFormActionBar
            isEdit
            isSaving={isSaving}
            isDisabled={isLoading || isSaving || !isDirty}
            isDirty={isDirty}
            mode="group"
            displayGroup={groupKey}
          />
        </ServiceDossierHeader>
        <Tabs
          value={activeSection}
          onValueChange={(value) => showSection(value as SectionId)}
          className="min-h-0 min-w-0 flex-1 gap-0"
        >
          <ServiceEditorTabBar
            tabs={SECTIONS}
            label="Shared application configuration"
          />
          <div
            ref={workspaceRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8"
            data-editor-workspace
          >
            <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6">
              <Alert variant="warning">
                <GitBranch aria-hidden="true" />
                <AlertTitle>Publishes to the entire service group</AlertTitle>
                <AlertDescription>
                  Changes here affect all {orderedVariants.length} bound
                  variants:{" "}
                  {orderedVariants
                    .map((variant) => formatServiceCode(variant.service_code))
                    .join(", ")}
                  . Fees and other individual registry fields are edited
                  separately.
                </AlertDescription>
              </Alert>

              <ServiceEditorSection
                id="variant-routing"
                icon={GitBranch}
                title="Timing & Routing"
                description={timingRoutingDescription(true)}
                summary={routingSummary}
              >
                {isLoading ? (
                  <div
                    role="status"
                    className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
                  >
                    <Spinner /> Loading routing configuration&hellip;
                  </div>
                ) : (
                  <CaseQuestionsSection
                    embedded
                    variants={orderedVariants}
                    formDefinition={definition}
                    publishedFieldKeys={immutableKeys}
                    targetOptions={targetOptions}
                    currentServiceCode={groupKey}
                    onFormDefinitionChange={updateDefinition}
                  />
                )}
              </ServiceEditorSection>

              <ServiceEditorSection
                id="application-form"
                icon={SlidersHorizontal}
                title="Application Form"
                description={applicationFormDescription(templateVersion)}
                headerDivider={false}
                summary={applicationSummary}
              >
                <ApplicationFormSection
                  embedded
                  showSharedNotice={false}
                  templateName={templateName}
                  templateVersion={templateVersion}
                  templateSharedCodes={templateSharedCodes}
                  publishedFieldKeys={immutableKeys}
                  formDefinition={definition}
                  isLoading={isLoading}
                  onTemplateNameChange={(name) => {
                    setTemplateName(name);
                    setIsDirty(true);
                  }}
                  onFormDefinitionChange={updateDefinition}
                />
              </ServiceEditorSection>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Section {activeIndex + 1} of {SECTIONS.length}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  {previousSection ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => showSection(previousSection.id)}
                    >
                      <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                      Previous
                    </Button>
                  ) : null}
                  {nextSection ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => showSection(nextSection.id)}
                    >
                      {nextSection.label}
                      <ArrowRight aria-hidden="true" data-icon="inline-end" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </form>

      <DiscardChangesDialog
        open={blocker.status === "blocked"}
        subject="the shared application"
        onKeepEditing={() => blocker.status === "blocked" && blocker.reset()}
        onDiscard={() => blocker.status === "blocked" && blocker.proceed()}
      />
    </div>
  );
}
