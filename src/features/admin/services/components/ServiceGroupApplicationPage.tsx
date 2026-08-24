import { useEffect, useMemo, useState } from "react";
import { Link, useBlocker, useRouter } from "@tanstack/react-router";
import { ArrowLeft, GitBranch, Save } from "lucide-react";
import { toast } from "sonner";
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
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { ApplicationFormSection } from "./service-form-sections/ApplicationFormSection";
import { CaseFlowBuilder } from "~/features/forms/components/CaseFlowBuilder";
import {
  getServiceFormTemplateFn,
  publishServiceFormTemplateFn,
} from "~/features/forms/form-template.functions";
import {
  formTemplateDefinitionSchema,
  type FormTemplateDefinition,
} from "~/features/forms/form-template.types";
import { buildLegacyFormDefinition } from "~/features/forms/form-template.utils";
import { cn } from "~/lib/utils";
import type { Service } from "../services.types";

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
}: {
  variants: Service[];
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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [templateName, setTemplateName] = useState("Application form");
  const [templateVersion, setTemplateVersion] = useState(0);
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

  const blocker = useBlocker({
    enableBeforeUnload: isDirty,
    shouldBlockFn: ({ current, next }) =>
      current.pathname !== next.pathname && isDirty,
    withResolver: true,
  });

  function updateDefinition(nextDefinition: FormTemplateDefinition) {
    setDefinition(nextDefinition);
    setIsDirty(true);
  }

  async function publish() {
    const parsed = formTemplateDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Check the application form fields.",
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
      toast.error("Map every internal variant before publishing.");
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
        },
      });
      setTemplateVersion(published.version);
      setImmutableKeys(publishedKeys(parsed.data));
      setIsDirty(false);
      await router.invalidate();
      toast.success("Shared application published.", {
        description: `Version ${published.version} now applies to all ${orderedVariants.length} variants.`,
      });
    } catch (error) {
      toast.error("Could not publish the shared application.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dashboard-page max-w-7xl">
      <header className="px-1 pt-1">
        <div className="flex items-center justify-between gap-3 pb-3">
          <Link
            to="/admin/services/groups/$displayGroup"
            params={{ displayGroup: groupKey }}
            search={{ scope: undefined }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {displayName}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">
            Shared application
          </p>
        </div>

        <div className="grid gap-6 border-y py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:py-7">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Group-wide configuration
            </p>
            <h1 className="text-pretty text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
              Edit shared application
            </h1>
            <p className="mt-3 max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">
              Configure the questions that identify the correct internal variant
              and the application fields every applicant completes.
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Active version
            </p>
            <p className="mt-1 text-xl font-semibold text-primary">
              {templateVersion > 0 ? `v${templateVersion}` : "Not published"}
            </p>
          </div>
        </div>
      </header>

      <main className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Alert variant="warning">
            <GitBranch aria-hidden="true" />
            <AlertTitle>Publishes to the entire service group</AlertTitle>
            <AlertDescription>
              Changes here affect all {orderedVariants.length} bound variants:
              {" "}{orderedVariants.map((variant) => variant.service_code).join(", ")}.
              Fees and other individual registry fields are edited separately.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="border-b">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Step 1 · Match the internal record
                </p>
                <CardTitle className="mt-1">Variant routing</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Spinner /> Loading routing configuration&hellip;
                </div>
              ) : (
                <CaseFlowBuilder
                  definition={definition.caseSelector}
                  variants={orderedVariants}
                  derivedSources={(definition.derivedAnswers ?? []).map(
                    (derived) => ({
                      key: derived.key,
                      label: derived.label,
                      options: derived.bands.map((band) => ({
                        value: band.value,
                        label: band.label,
                      })),
                    }),
                  )}
                  immutableQuestionKeys={immutableKeys}
                  onChange={(caseSelector) =>
                    updateDefinition({ ...definition, caseSelector })
                  }
                />
              )}
            </CardContent>
          </Card>

          <ApplicationFormSection
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
        </div>

        <aside className="lg:sticky lg:top-6">
          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Shared application</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={publish}
                disabled={isLoading || isSaving || !isDirty}
              >
                {isSaving ? (
                  <>
                    <Spinner data-icon="inline-start" /> Publishing&hellip;
                  </>
                ) : (
                  <>
                    <Save aria-hidden="true" data-icon="inline-start" />
                    Publish changes
                  </>
                )}
              </Button>
              <Link
                to="/admin/services/groups/$displayGroup"
                params={{ displayGroup: groupKey }}
                search={{ scope: undefined }}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Back to group
              </Link>
              <p className="text-xs leading-5 text-muted-foreground">
                Publishing creates a new immutable template version. It does not
                change variant fees or processing times.
              </p>
            </CardContent>
          </Card>
        </aside>
      </main>

      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.status === "blocked") blocker.reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unpublished changes?</AlertDialogTitle>
            <AlertDialogDescription>
              If you leave now, changes to this shared application will be lost.
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
