import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Blocks, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { FormTemplateBuilder } from "~/features/forms/components/FormTemplateBuilder";
import {
  deleteFormFieldBlockFn,
  saveFormFieldBlockFn,
  type FormFieldBlockWithUsage,
} from "~/features/forms/form-field-block.functions";
import {
  formFieldBlockSchema,
  type FormFieldBlock,
  type FormStep,
  type FormTemplateDefinition,
} from "~/features/forms/form-template.types";
import { formatServiceCode } from "~/features/services/service-utils";
import { cn } from "~/lib/utils";

const STEP_LABELS: Record<FormStep, string> = {
  case: "Case details",
  details: "Personal details",
};

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return /^[a-z]/.test(slug) ? slug.slice(0, 64) : `block_${slug}`.slice(0, 64);
}

function emptyBlock(): FormFieldBlock {
  return {
    blockKey: "",
    name: "",
    description: "",
    step: "case",
    fields: [
      {
        key: "new_question",
        type: "text",
        label: "New question",
        required: false,
      },
    ],
  };
}

/** The builder edits a whole template; a block is one step's worth of fields. */
function toDefinition(block: FormFieldBlock): FormTemplateDefinition {
  return {
    schemaVersion: 1,
    sections: [
      {
        key: block.step,
        step: block.step,
        title: STEP_LABELS[block.step],
        fields: block.fields,
      },
    ],
  };
}

export function FormBlocksPage({
  blocks,
  initialBlockKey,
}: {
  blocks: FormFieldBlockWithUsage[];
  initialBlockKey?: string;
}) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string | "new" | null>(
    initialBlockKey && blocks.some((entry) => entry.block.blockKey === initialBlockKey)
      ? initialBlockKey
      : (blocks[0]?.block.blockKey ?? null),
  );
  const selected = useMemo(
    () => blocks.find((entry) => entry.block.blockKey === selectedKey) ?? null,
    [blocks, selectedKey],
  );

  const [draft, setDraft] = useState<FormFieldBlock>(
    () => selected?.block ?? emptyBlock(),
  );
  const [keyTouched, setKeyTouched] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Reload the draft when the selection changes or the server data refreshes
  // (after a save the version moves on).
  useEffect(() => {
    if (selectedKey === "new") {
      setDraft(emptyBlock());
    } else if (selected) {
      setDraft(selected.block);
    }
    setKeyTouched(false);
    setIsDirty(false);
  }, [selectedKey, selected]);

  const isNew = selectedKey === "new" || !selected;
  const usage = selected?.usage ?? [];
  const usedServiceCount = usage.reduce(
    (total, template) => total + template.serviceCodes.length,
    0,
  );
  const lockedKeys = selected ? selected.block.fields.map((field) => field.key) : [];

  function patch(next: Partial<FormFieldBlock>) {
    setDraft((previous) => ({ ...previous, ...next }));
    setIsDirty(true);
  }

  function validate(): FormFieldBlock | null {
    const parsed = formFieldBlockSchema.safeParse({
      ...draft,
      description: draft.description?.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the block details.");
      return null;
    }
    if (
      isNew &&
      blocks.some((entry) => entry.block.blockKey === parsed.data.blockKey)
    ) {
      toast.error("A block with this key already exists.");
      return null;
    }
    return parsed.data;
  }

  function requestSave() {
    if (!validate()) return;
    // Anything that republishes live forms is confirmed first.
    if (usage.length > 0) setConfirmOpen(true);
    else void save();
  }

  async function save() {
    const block = validate();
    if (!block) return;
    setConfirmOpen(false);
    setIsSaving(true);
    try {
      const result = await saveFormFieldBlockFn({
        data: {
          block,
          expectedVersion: isNew ? undefined : selected?.block.version,
        },
      });
      toast.success("Shared block saved.", {
        description:
          result.republishedTemplates.length > 0
            ? `Republished ${result.republishedTemplates.length} ${
                result.republishedTemplates.length === 1 ? "form" : "forms"
              }.`
            : "No form includes it yet.",
      });
      setSelectedKey(block.blockKey);
      setIsDirty(false);
      await router.invalidate();
    } catch (error) {
      toast.error("Could not save the shared block.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!selected) return;
    setDeleteOpen(false);
    try {
      await deleteFormFieldBlockFn({ data: { blockKey: selected.block.blockKey } });
      toast.success("Shared block deleted.");
      setSelectedKey(null);
      await router.invalidate();
    } catch (error) {
      toast.error("Could not delete the shared block.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="dashboard-page max-w-7xl">
      <header className="flex flex-col gap-3 px-1 pt-1">
        <Link
          to="/admin/services"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Services Registry
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-foreground">
            Shared question blocks
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Questions that several application forms have in common. Change a
            block once and every form that includes it is updated. Existing
            requests keep the form they were submitted under.
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label="Shared blocks" className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedKey("new")}
            className="justify-start"
          >
            <Plus data-icon="inline-start" />
            New block
          </Button>
          {blocks.map(({ block, usage: blockUsage }) => (
            <button
              key={block.blockKey}
              type="button"
              onClick={() => setSelectedKey(block.blockKey)}
              aria-current={selectedKey === block.blockKey ? "true" : undefined}
              className={cn(
                "flex flex-col gap-1 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                selectedKey === block.blockKey && "border-primary bg-primary-soft/40",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Blocks aria-hidden="true" className="size-4 shrink-0" />
                {block.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {block.fields.length}{" "}
                {block.fields.length === 1 ? "question" : "questions"} ·{" "}
                {blockUsage.length === 0
                  ? "not used yet"
                  : `${blockUsage.length} ${blockUsage.length === 1 ? "form" : "forms"}`}
              </span>
            </button>
          ))}
          {blocks.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              No shared blocks yet. Create one to reuse questions across forms.
            </p>
          ) : null}
        </nav>

        {selectedKey === null ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Select a block to edit it, or create a new one.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>
                <h2>{isNew ? "New shared block" : selected?.block.name}</h2>
              </CardTitle>
              <CardDescription>
                {isNew
                  ? "Create the questions, then include the block from a form's editor."
                  : `Version ${selected?.block.version}. Saving republishes the forms below.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="block-name">Block name</FieldLabel>
                  <Input
                    id="block-name"
                    value={draft.name}
                    autoComplete="off"
                    placeholder="Birth details"
                    onChange={(event) => {
                      const name = event.target.value;
                      patch({
                        name,
                        ...(isNew && !keyTouched ? { blockKey: slugify(name) } : {}),
                      });
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="block-key">Block key</FieldLabel>
                  <Input
                    id="block-key"
                    value={draft.blockKey}
                    disabled={!isNew}
                    autoComplete="off"
                    onChange={(event) => {
                      setKeyTouched(true);
                      patch({
                        blockKey: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, "_"),
                      });
                    }}
                  />
                  <FieldDescription>
                    {isNew
                      ? "Identifier used by forms. Can't be changed once saved."
                      : "Locked after the first save."}
                  </FieldDescription>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="block-description">Description</FieldLabel>
                  <Input
                    id="block-description"
                    value={draft.description ?? ""}
                    autoComplete="off"
                    placeholder="Shown only to administrators"
                    onChange={(event) => patch({ description: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Applicant step</FieldLabel>
                  <div className="flex items-center gap-2">
                    {(Object.keys(STEP_LABELS) as FormStep[]).map((step) => (
                      <Button
                        key={step}
                        type="button"
                        size="sm"
                        variant={draft.step === step ? "default" : "outline"}
                        disabled={!isNew && usage.length > 0}
                        onClick={() => patch({ step })}
                      >
                        {STEP_LABELS[step]}
                      </Button>
                    ))}
                  </div>
                  {!isNew && usage.length > 0 ? (
                    <FieldDescription>
                      A block that forms already use stays on its step.
                    </FieldDescription>
                  ) : null}
                </Field>
              </div>

              {usage.length > 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-semibold">
                    Used by {usage.length} {usage.length === 1 ? "form" : "forms"} ·{" "}
                    {usedServiceCount}{" "}
                    {usedServiceCount === 1 ? "service" : "services"}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {usage.map((template) => (
                      <li key={template.templateId} className="text-xs">
                        <span className="font-medium">{template.templateName}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          ·{" "}
                          {template.serviceCodes.map(formatServiceCode).join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <FormTemplateBuilder
                definition={toDefinition(draft)}
                onChange={(definition) =>
                  patch({
                    fields:
                      definition.sections.find((section) => section.step === draft.step)
                        ?.fields.map(({ blockKey: _ignored, ...field }) => field) ??
                      [],
                  })
                }
                immutableKeys={lockedKeys}
                steps={[draft.step]}
                allowPersonGroup={false}
                allowSharedBlocks={false}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div>
                  {!isNew && usage.length === 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 data-icon="inline-start" />
                      Delete block
                    </Button>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {isDirty ? <Badge variant="outline">Unsaved changes</Badge> : null}
                  <Button type="button" onClick={requestSave} disabled={isSaving || !isDirty}>
                    {isSaving ? <Spinner /> : <Save data-icon="inline-start" />}
                    {isNew ? "Create block" : "Save block"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Update {usage.length} {usage.length === 1 ? "form" : "forms"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Saving publishes a new version of each form below, covering{" "}
              {usedServiceCount} {usedServiceCount === 1 ? "service" : "services"}.
              Requests already submitted keep the form they used. If any form
              can&rsquo;t take the change, nothing is published.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-48 overflow-y-auto text-sm">
            {usage.map((template) => (
              <li key={template.templateId} className="py-0.5">
                {template.templateName}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void save()}>
              Save and republish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this shared block?</AlertDialogTitle>
            <AlertDialogDescription>
              No form includes it, so no application changes. This can&rsquo;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
