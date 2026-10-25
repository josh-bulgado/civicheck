import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHotkeys, type HotkeyChord } from "@tanstack/react-hotkeys";
import { useBlocker, useRouter } from "@tanstack/react-router";
import { QuietLink as Link } from "~/components/quiet-link";
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import {
  ArrowLeft,
  Blocks,
  ChevronRight,
  Info,
  Link2,
  ListChecks,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
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
import { Card, CardContent } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { IconTile } from "~/components/ui/icon-tile";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "~/components/ui/item";
import { Kbd } from "~/components/ui/kbd";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { cn } from "~/lib/utils";

type BlockTab = "questions" | "settings" | "usage";

const SAVE_HOTKEY: HotkeyChord = "Mod+S";
const NEW_HOTKEY: HotkeyChord = "N";
const SEARCH_HOTKEY: HotkeyChord = "/";
/** The one confirmation open at a time; each needs a different answer. */
type BlockDialog =
  | { kind: "publish" }
  | { kind: "delete" }
  | { kind: "switch"; key: string }
  | null;

/** The filled cell at the start of an input group, as in the service editor. */
const PREFIX_CELL = "self-stretch border-r bg-muted/60 px-3.5 py-0";

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

/** Only the editable parts; a saved block also carries an id and a version. */
function toFormValues(block: FormFieldBlock): FormFieldBlock {
  return {
    blockKey: block.blockKey,
    name: block.name,
    description: block.description ?? "",
    step: block.step,
    fields: block.fields,
  };
}

/** What gets saved: an empty description is left out. */
function toBlock(values: FormFieldBlock): FormFieldBlock {
  return { ...values, description: values.description?.trim() || undefined };
}

/** The builder edits a whole template; a block is one step's worth of fields. */
function toDefinition(
  step: FormStep,
  fields: FormFieldBlock["fields"],
): FormTemplateDefinition {
  return {
    schemaVersion: 1,
    sections: [{ key: step, step, title: STEP_LABELS[step], fields }],
  };
}

/** The first message in react-hook-form's nested error tree, for the toast. */
function firstErrorMessage(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const { message } = node as { message?: unknown };
  if (typeof message === "string") return message;
  for (const [key, child] of Object.entries(node)) {
    if (key === "ref") continue;
    const found = firstErrorMessage(child);
    if (found) return found;
  }
  return undefined;
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
    initialBlockKey &&
      blocks.some((entry) => entry.block.blockKey === initialBlockKey)
      ? initialBlockKey
      : (blocks[0]?.block.blockKey ?? null),
  );
  const selected = useMemo(
    () => blocks.find((entry) => entry.block.blockKey === selectedKey) ?? null,
    [blocks, selectedKey],
  );

  // The block being edited. react-hook-form owns its values, whether it has
  // unsaved changes, and whether a save is in flight.
  const form = useForm<FormFieldBlock>({
    // The schema's input type marks defaulted flags (like `required`) optional.
    // Every value here comes from a parsed block or the builder, which set
    // them, so the form works with the parsed type throughout.
    resolver: zodResolver(formFieldBlockSchema) as Resolver<FormFieldBlock>,
    defaultValues: toFormValues(selected?.block ?? emptyBlock()),
  });
  const { control, reset, setFocus } = form;
  const { errors, isDirty, isSubmitting } = form.formState;
  const [blockKey, step, fields] = useWatch({
    control,
    name: ["blockKey", "step", "fields"],
  });

  const [tab, setTab] = useState<BlockTab>("questions");
  const [railOpen, setRailOpen] = useState(true);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  // A save that republishes live forms, a delete, or a switch away from
  // unsaved edits waits here for the person's confirmation.
  const [dialog, setDialog] = useState<BlockDialog>(null);

  // Reload the form when the selection changes or the server data refreshes
  // (after a save the version moves on).
  useEffect(() => {
    if (selectedKey === "new") {
      reset(toFormValues(emptyBlock()));
    } else if (selected) {
      reset(toFormValues(selected.block));
    }
  }, [selectedKey, selected, reset]);

  const isNew = selectedKey === "new" || !selected;
  const usage = selected?.usage ?? [];
  const usedServiceCount = usage.reduce(
    (total, template) => total + template.serviceCodes.length,
    0,
  );
  const lockedKeys = selected
    ? selected.block.fields.map((field) => field.key)
    : [];
  const query = search.trim().toLowerCase();
  const visibleBlocks = blocks.filter(
    ({ block }) =>
      !query ||
      block.name.toLowerCase().includes(query) ||
      block.blockKey.includes(query),
  );

  // A new block starts at its name, the one thing it can't be saved without.
  useEffect(() => {
    if (selectedKey === "new") {
      setTab("questions");
      setFocus("name");
    }
  }, [selectedKey, setFocus]);

  // Leaving the page drops the draft too, so it gets the same confirmation the
  // service editor shows.
  const blocker = useBlocker({
    enableBeforeUnload: isDirty,
    shouldBlockFn: ({ current, next }) =>
      isDirty && current.pathname !== next.pathname,
    withResolver: true,
  });

  function selectBlock(key: string) {
    if (key === selectedKey) return;
    if (isDirty) setDialog({ kind: "switch", key });
    else setSelectedKey(key);
  }

  function discard() {
    if (isNew) {
      setSelectedKey(blocks[0]?.block.blockKey ?? null);
      return;
    }
    if (selected) reset(toFormValues(selected.block));
  }

  // Say what's wrong, and open the tab it's on.
  function onInvalid(invalid: FieldErrors<FormFieldBlock>) {
    if (invalid.fields) setTab("questions");
    else if (invalid.blockKey || invalid.description) setTab("settings");
    toast.error(firstErrorMessage(invalid) ?? "Check the block details.");
  }

  const requestSave = form.handleSubmit((values) => {
    const block = toBlock(values);
    if (
      isNew &&
      blocks.some((entry) => entry.block.blockKey === block.blockKey)
    ) {
      const message = "A block with this key already exists.";
      form.setError("blockKey", { message });
      setTab("settings");
      toast.error(message);
      return;
    }
    // Anything that republishes live forms is confirmed first.
    if (usage.length > 0) {
      setDialog({ kind: "publish" });
      return;
    }
    return save(block);
  }, onInvalid);

  const confirmSave = form.handleSubmit(
    (values) => save(toBlock(values)),
    onInvalid,
  );

  async function save(block: FormFieldBlock) {
    setDialog(null);
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
      await router.invalidate();
    } catch (error) {
      toast.error("Could not save the shared block.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function remove() {
    if (!selected) return;
    setDialog(null);
    try {
      await deleteFormFieldBlockFn({
        data: { blockKey: selected.block.blockKey },
      });
      toast.success("Shared block deleted.");
      setSelectedKey(null);
      await router.invalidate();
    } catch (error) {
      toast.error("Could not delete the shared block.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  // The shortcuts the buttons and the search box advertise. Plain keys are
  // ignored while a field has focus; Mod+S is not.
  const hotkeyLabel = useHotkeyLabel();
  useHotkeys(
    [
      {
        hotkey: SAVE_HOTKEY,
        callback: () => {
          if (isDirty && !isSubmitting && selectedKey !== null) {
            void requestSave();
          }
        },
      },
      { hotkey: NEW_HOTKEY, callback: () => selectBlock("new") },
      { hotkey: SEARCH_HOTKEY, callback: () => searchRef.current?.focus() },
    ],
    // A confirmation is open, so nothing behind it should react.
    { enabled: !dialog && blocker.status !== "blocked" },
  );

  return (
    <div className="dashboard-page max-w-7xl">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-1 pt-1">
        <div className="flex flex-col gap-3">
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
        </div>
        <Button
          type="button"
          variant="raised"
          onClick={() => selectBlock("new")}
          aria-keyshortcuts="N"
        >
          <Plus data-icon="inline-start" />
          New block
          <Kbd
            aria-hidden="true"
            className="bg-white/20 text-current max-sm:hidden"
          >
            {hotkeyLabel(NEW_HOTKEY)}
          </Kbd>
        </Button>
      </header>

      <div
        className={cn(
          "mt-6 grid gap-6",
          railOpen && "lg:grid-cols-[18rem_minmax(0,1fr)]",
        )}
      >
        <nav
          aria-label="Shared blocks"
          className={cn(
            "flex flex-col gap-2 self-start",
            !railOpen && "lg:hidden",
          )}
        >
          <InputGroup size="lg">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              type="search"
              value={search}
              autoComplete="off"
              placeholder="Search blocks"
              aria-label="Search blocks"
              aria-keyshortcuts="/"
              onChange={(event) => setSearch(event.target.value)}
            />
            {search ? null : (
              <InputGroupAddon align="inline-end">
                <Kbd aria-hidden="true">{hotkeyLabel(SEARCH_HOTKEY)}</Kbd>
              </InputGroupAddon>
            )}
          </InputGroup>
          {visibleBlocks.map(({ block, usage: blockUsage }) => (
            <Item
              key={block.blockKey}
              render={<button type="button" />}
              variant="selectable"
              size="sm"
              className="flex-nowrap rounded-xl"
              onClick={() => selectBlock(block.blockKey)}
              aria-current={selectedKey === block.blockKey ? "true" : undefined}
            >
              <ItemMedia>
                <IconTile
                  icon={Blocks}
                  className="size-9 rounded-xl [&_svg]:size-4"
                />
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0">
                <ItemTitle className="max-w-full font-semibold">
                  <span className="truncate">{block.name}</span>
                </ItemTitle>
                <ItemDescription className="text-xs">
                  {block.fields.length}{" "}
                  {block.fields.length === 1 ? "question" : "questions"}
                </ItemDescription>
              </ItemContent>
              {selectedKey === block.blockKey && isDirty ? (
                <span
                  role="img"
                  aria-label="Unsaved changes"
                  className="size-2 shrink-0 rounded-full bg-warning"
                />
              ) : null}
              <ItemActions className="shrink-0 flex-col items-end gap-0 text-right text-xs text-muted-foreground tabular-nums">
                {blockUsage.length === 0 ? (
                  "Unused"
                ) : (
                  <>
                    <span className="text-sm font-semibold text-foreground">
                      {blockUsage.length}
                    </span>
                    {blockUsage.length === 1 ? "form" : "forms"}
                  </>
                )}
              </ItemActions>
            </Item>
          ))}
          {blocks.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              No shared blocks yet. Create one to reuse questions across forms.
            </p>
          ) : visibleBlocks.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              No block matches &ldquo;{search.trim()}&rdquo;.
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
          <div className="flex min-w-0 flex-col gap-4">
            <Card className="gap-0 py-0" variant="soft">
              <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 px-5 pt-5 pb-4">
                <div className="flex min-w-0 flex-1 basis-72 flex-col gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="-ml-2 hidden self-start text-muted-foreground lg:inline-flex"
                    onClick={() => setRailOpen((open) => !open)}
                    aria-expanded={railOpen}
                  >
                    {railOpen ? (
                      <PanelLeftClose data-icon="inline-start" />
                    ) : (
                      <PanelLeftOpen data-icon="inline-start" />
                    )}
                    {railOpen ? "Hide block list" : "Show block list"}
                  </Button>
                  <h2 className="sr-only">
                    {isNew ? "New shared block" : selected?.block.name}
                  </h2>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field, fieldState }) => (
                      // The group is the inline surface (borderless until hovered
                      // or focused) so the pencil addon shares the input's fill.
                      <InputGroup
                        size="lg"
                        className="border-transparent shadow-none hover:border-input has-[[data-slot=input-group-control]:focus-visible]:bg-background"
                      >
                        <InputGroupInput
                          {...field}
                          autoComplete="off"
                          className="data-[variant=inline]:focus-visible:bg-transparent"
                          placeholder="Name this block"
                          aria-label="Block name"
                          aria-invalid={fieldState.invalid}
                          onChange={(event) => {
                            const next = event.target.value;
                            // A new block's key follows its name until the
                            // person sets a key of their own.
                            const current = form.getValues("blockKey");
                            const slugOf = (value: string) =>
                              value.trim() ? slugify(value) : "";
                            if (
                              isNew &&
                              (current === "" ||
                                current === slugOf(field.value))
                            ) {
                              form.setValue("blockKey", slugOf(next), {
                                shouldDirty: true,
                              });
                            }
                            field.onChange(next);
                          }}
                          variant="inline"
                        />
                        <InputGroupAddon align="inline-end">
                          <Pencil
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                          />
                        </InputGroupAddon>
                      </InputGroup>
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="neutral" className="font-mono">
                      {!isNew ? <Lock data-icon="inline-start" /> : null}
                      {blockKey || "block_key"}
                    </Badge>
                    <Badge variant="neutral">
                      {isNew ? "Draft" : `v${selected?.block.version}`}
                    </Badge>
                    <Badge variant="info">{STEP_LABELS[step]}</Badge>
                  </div>
                </div>
                {usage.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTab("usage")}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-success"
                    />
                    Live in {usage.length}{" "}
                    {usage.length === 1 ? "form" : "forms"} · {usedServiceCount}{" "}
                    {usedServiceCount === 1 ? "service" : "services"}
                    <ChevronRight data-icon="inline-end" />
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not used by any form yet
                  </p>
                )}
              </div>

              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as BlockTab)}
                className="gap-0"
              >
                <div className="border-b border-border px-5">
                  <TabsList
                    variant="line"
                    className="w-full justify-start"
                    aria-label="Block sections"
                  >
                    <TabsTrigger
                      value="questions"
                      className="flex-none gap-2 px-3"
                    >
                      <ListChecks aria-hidden="true" />
                      Questions
                      <Badge variant="neutral">{fields.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger
                      value="settings"
                      className="flex-none gap-2 px-3"
                    >
                      <Settings2 aria-hidden="true" />
                      Settings
                    </TabsTrigger>
                    <TabsTrigger value="usage" className="flex-none gap-2 px-3">
                      <Link2 aria-hidden="true" />
                      Used by
                      <Badge variant="neutral">{usage.length}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="questions" keepMounted className="p-5">
                  <Controller
                    control={control}
                    name="fields"
                    render={({ field }) => (
                      <FormTemplateBuilder
                        definition={toDefinition(step, field.value)}
                        onChange={(definition) =>
                          field.onChange(
                            definition.sections
                              .find((section) => section.step === step)
                              ?.fields.map(
                                ({ blockKey: _ignored, ...rest }) => rest,
                              ) ?? [],
                          )
                        }
                        immutableKeys={lockedKeys}
                        steps={[step]}
                        allowPersonGroup={false}
                        allowSharedBlocks={false}
                      />
                    )}
                  />
                </TabsContent>

                <TabsContent
                  value="settings"
                  className="flex flex-col gap-6 p-5"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={Boolean(errors.blockKey)}>
                      <FieldLabel htmlFor="block-key">Block key</FieldLabel>
                      <Controller
                        control={control}
                        name="blockKey"
                        render={({ field, fieldState }) => (
                          <InputGroup size="lg">
                            {!isNew ? (
                              <InputGroupAddon className={PREFIX_CELL}>
                                <Lock aria-hidden="true" />
                              </InputGroupAddon>
                            ) : null}
                            <InputGroupInput
                              {...field}
                              id="block-key"
                              fieldSize="lg"
                              disabled={!isNew}
                              autoComplete="off"
                              aria-invalid={fieldState.invalid}
                              className="font-mono"
                              onChange={(event) =>
                                field.onChange(
                                  event.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9_]/g, "_"),
                                )
                              }
                            />
                          </InputGroup>
                        )}
                      />
                      <FieldDescription>
                        {isNew
                          ? "Identifier used by forms. Can't be changed once saved."
                          : "Locked after the first save."}
                      </FieldDescription>
                      {errors.blockKey ? (
                        <FieldError errors={[errors.blockKey]} />
                      ) : null}
                    </Field>
                    <Field className="sm:col-span-2">
                      <FieldLabel>Applicant step</FieldLabel>
                      <Controller
                        control={control}
                        name="step"
                        render={({ field }) => (
                          <Tabs
                            value={field.value}
                            onValueChange={(value) =>
                              field.onChange(value as FormStep)
                            }
                          >
                            <TabsList
                              variant="segmented"
                              aria-label="Applicant step"
                              className="w-fit"
                            >
                              {(Object.keys(STEP_LABELS) as FormStep[]).map(
                                (option) => (
                                  <TabsTrigger
                                    key={option}
                                    value={option}
                                    disabled={!isNew && usage.length > 0}
                                  >
                                    {STEP_LABELS[option]}
                                  </TabsTrigger>
                                ),
                              )}
                            </TabsList>
                          </Tabs>
                        )}
                      />
                      <FieldDescription>
                        {!isNew && usage.length > 0
                          ? "A block that forms already use stays on its step."
                          : "Which page of the applicant's form the block appears on."}
                      </FieldDescription>
                    </Field>
                    <Field
                      className="sm:col-span-2"
                      data-invalid={Boolean(errors.description)}
                    >
                      <FieldLabel htmlFor="block-description">
                        Description
                      </FieldLabel>
                      <Input
                        {...form.register("description")}
                        id="block-description"
                        fieldSize="lg"
                        autoComplete="off"
                        placeholder="Shown only to administrators"
                      />
                      {errors.description ? (
                        <FieldError errors={[errors.description]} />
                      ) : null}
                    </Field>
                  </div>

                  {!isNew ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                      <div>
                        <p className="text-sm font-semibold">
                          Delete this block
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {usage.length === 0
                            ? "No form includes it, so no application changes. This can't be undone."
                            : `Used by ${usage.length} ${usage.length === 1 ? "form" : "forms"}. Remove it from those forms first.`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={usage.length > 0}
                        onClick={() => setDialog({ kind: "delete" })}
                      >
                        <Trash2 data-icon="inline-start" />
                        Delete block
                      </Button>
                    </div>
                  ) : null}
                </TabsContent>

                <TabsContent value="usage" className="flex flex-col gap-4 p-5">
                  {usage.length > 0 ? (
                    <>
                      <Alert variant="info" role="status">
                        <Info aria-hidden="true" />
                        <AlertDescription>
                          Saving republishes each form below. Requests already
                          submitted keep the form they used.
                        </AlertDescription>
                      </Alert>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {usage.map((template) => (
                          <li
                            key={template.templateId}
                            className="flex min-w-0 flex-col gap-1.5 rounded-lg bg-muted/40 px-3.5 py-3 ring-1 ring-border ring-inset"
                          >
                            <span className="text-sm font-semibold">
                              {template.templateName}
                            </span>
                            <span className="flex flex-wrap gap-1">
                              {template.serviceCodes.map((code) => (
                                <Badge
                                  key={code}
                                  variant="neutral"
                                  className="font-mono"
                                >
                                  {formatServiceCode(code)}
                                </Badge>
                              ))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No form includes this block yet. Add it from a
                      form&rsquo;s editor and it will show up here.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </Card>

            <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 shadow-md">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {isDirty ? (
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full bg-warning"
                  />
                ) : null}
                {isDirty ? "Unsaved changes. " : ""}
                {usage.length > 0
                  ? `Saving republishes ${usage.length} ${usage.length === 1 ? "form" : "forms"}.`
                  : "No form includes this block yet."}
              </p>
              <div className="flex items-center gap-2">
                {isDirty ? (
                  <Button type="button" variant="ghost" onClick={discard}>
                    Discard
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="raised"
                  aria-keyshortcuts="Control+S Meta+S"
                  onClick={() => void requestSave()}
                  disabled={isSubmitting || !isDirty}
                >
                  {isSubmitting ? (
                    <Spinner />
                  ) : (
                    <Save data-icon="inline-start" />
                  )}
                  {isNew ? "Create block" : "Save block"}
                  <Kbd
                    aria-hidden="true"
                    className="bg-white/20 text-current max-sm:hidden"
                  >
                    {hotkeyLabel(SAVE_HOTKEY)}
                  </Kbd>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={dialog?.kind === "publish"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Update {usage.length} {usage.length === 1 ? "form" : "forms"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Saving publishes a new version of each form below, covering{" "}
              {usedServiceCount}{" "}
              {usedServiceCount === 1 ? "service" : "services"}. Requests
              already submitted keep the form they used. If any form can&rsquo;t
              take the change, nothing is published.
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
            <AlertDialogAction onClick={() => void confirmSave()}>
              Save and republish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog?.kind === "switch"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits to this block are not saved. Switching blocks now will
              lose them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (dialog?.kind === "switch") setSelectedKey(dialog.key);
                setDialog(null);
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              If you leave this page now, your unsaved changes will be lost.
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

      <AlertDialog
        open={dialog?.kind === "delete"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this shared block?</AlertDialogTitle>
            <AlertDialogDescription>
              No form includes it, so no application changes. This can&rsquo;t
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
