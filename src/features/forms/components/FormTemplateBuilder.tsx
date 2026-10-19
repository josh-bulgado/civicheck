import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Blocks,
  Copy,
  Eye,
  GitBranch,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Empty, EmptyDescription } from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import {
  listInsertableBlocksFn,
  type FormFieldBlockRecord,
} from "../form-field-block.functions";
import { detachBlock, insertBlock } from "../form-field-block.utils";
import type {
  FormFieldDefinition,
  FormOption,
  FormStep,
  FormTemplateDefinition,
} from "../form-template.types";
import { optionUsage, restoreOption, type ConditionRef } from "../form-option-usage";
import { FormFieldInspector } from "./FormFieldInspector";
import {
  FIELD_TYPES,
  FormFieldIcon,
  fieldTypeLabel,
} from "./form-field-types";

const STEPS: Array<{ value: FormStep; label: string }> = [
  { value: "case", label: "Case details" },
  { value: "details", label: "Personal details" },
];

function fieldsInStep(definition: FormTemplateDefinition, step: FormStep) {
  return definition.sections
    .filter((section) => section.step === step)
    .flatMap((section) => section.fields);
}

function withStepFields(
  definition: FormTemplateDefinition,
  step: FormStep,
  fields: FormFieldDefinition[],
): FormTemplateDefinition {
  const firstIndex = definition.sections.findIndex(
    (section) => section.step === step,
  );
  if (firstIndex === -1) {
    return {
      ...definition,
      sections: [
        ...definition.sections,
        {
          key: step,
          step,
          title: step === "case" ? "Case details" : "Your details",
          fields,
        },
      ],
    };
  }

  return {
    ...definition,
    sections: definition.sections.map((section, index) =>
      index === firstIndex
        ? { ...section, fields }
        : section.step === step
          ? { ...section, fields: [] }
          : section,
    ),
  };
}

const COPY_SUFFIX = " (copy)";

function nextFieldKey(definition: FormTemplateDefinition) {
  const used = new Set(
    definition.sections.flatMap((section) =>
      section.fields.map((field) => field.key),
    ),
  );
  let index = 1;
  while (used.has(`custom_field_${index}`)) index += 1;
  return `custom_field_${index}`;
}

/**
 * Keys of the questions whose trigger question sits below them. A question
 * can only react to an answer the applicant has already given.
 */
function misorderedKeys(fields: FormFieldDefinition[]) {
  const position = new Map(fields.map((field, index) => [field.key, index]));
  const keys = new Set<string>();
  fields.forEach((field, index) => {
    const source = field.visibleWhen
      ? position.get(field.visibleWhen.field)
      : undefined;
    if (source !== undefined && source > index) keys.add(field.key);
  });
  return keys;
}

function describeVisibility(
  field: FormFieldDefinition,
  fields: FormFieldDefinition[],
  index: number,
) {
  if (!field.visibleWhen) return null;
  const { field: sourceKey, operator, value } = field.visibleWhen;
  const sourceIndex = fields.findIndex((candidate) => candidate.key === sourceKey);
  const source = fields[sourceIndex];
  const answer =
    source?.options?.find((option) => option.value === value)?.label ?? value;

  return {
    text: `${source?.label ?? sourceKey} ${operator === "equals" ? "is" : "is not"} ${answer}`,
    misordered: sourceIndex > index,
  };
}

export function FormTemplateBuilder({
  definition,
  onChange,
  immutableKeys = [],
  steps: visibleSteps,
  allowPersonGroup = true,
  allowSharedBlocks = true,
  externalConditions,
}: {
  definition: FormTemplateDefinition;
  onChange: (definition: FormTemplateDefinition) => void;
  immutableKeys?: string[];
  /** Restrict the editor to some steps (the block editor edits just one). */
  steps?: FormStep[];
  /** A shared block can't contain the person name group. */
  allowPersonGroup?: boolean;
  /** Hide shared-block insertion (a block can't include other blocks). */
  allowSharedBlocks?: boolean;
  /** Conditions outside this form (requirements) that point at its dropdown options. */
  externalConditions?: readonly ConditionRef[];
}) {
  const immutableKeySet = new Set(immutableKeys);
  const fieldTypes = FIELD_TYPES.filter(
    (type) => allowPersonGroup || type.value !== "person_group",
  );
  const stepsToShow = STEPS.filter(
    (step) => !visibleSteps || visibleSteps.includes(step.value),
  );
  const [blocks, setBlocks] = useState<FormFieldBlockRecord[]>([]);
  const [selected, setSelected] = useState<{
    step: FormStep;
    id: string;
  } | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  // The control that opened the inspector sheet, so closing it can hand focus
  // back there. Null when the sheet opened some other way (Add Field).
  const openerRef = useRef<HTMLElement | null>(null);

  // Questions have no id of their own and their key is editable, so rows get a
  // client-only id. It keeps a row's identity (and focus) through key edits and
  // reordering. Any change this component did not make resets a step's ids.
  const idCounter = useRef(0);
  const idsByStep = useRef<Partial<Record<FormStep, string[]>>>({});
  const latestDefinition = useRef(definition);
  latestDefinition.current = definition;

  function mintId(step: FormStep) {
    idCounter.current += 1;
    return `${step}-row-${idCounter.current}`;
  }

  function rowIdsFor(step: FormStep, count: number) {
    const current = idsByStep.current[step];
    if (current && current.length === count) return current;
    const next = Array.from({ length: count }, () => mintId(step));
    idsByStep.current[step] = next;
    return next;
  }

  // Shared blocks only power the insert menu and the badge names; the builder
  // is fully usable without them, so a failed load is not worth an error toast.
  useEffect(() => {
    if (!allowSharedBlocks) return;
    let cancelled = false;
    listInsertableBlocksFn()
      .then((loaded) => {
        if (!cancelled) setBlocks(loaded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [allowSharedBlocks]);

  const blockNameByKey = new Map(
    blocks.map((block) => [block.blockKey, block.name]),
  );
  const includedBlockKeys = new Set(
    definition.sections.flatMap((section) =>
      section.fields.flatMap((field) =>
        field.blockKey ? [field.blockKey] : [],
      ),
    ),
  );

  function addBlock(block: FormFieldBlockRecord) {
    const result = insertBlock(definition, block);
    if (!result.ok) {
      toast.error("Can't add this shared block.", {
        description: result.reason,
      });
      return;
    }
    onChange(result.definition);
  }

  function detach(blockKey: string) {
    onChange(detachBlock(definition, blockKey));
    toast.success("Detached from the shared block.", {
      description:
        "These questions are now local to this form and won't change with the block.",
    });
  }

  function updateField(
    step: FormStep,
    index: number,
    patch: Partial<FormFieldDefinition>,
  ) {
    // Always build from the latest definition: this also runs from toast
    // actions that were created before later edits.
    const current = latestDefinition.current;
    const fields = fieldsInStep(current, step);
    fields[index] = { ...fields[index], ...patch };
    onChange(withStepFields(current, step, fields));
  }

  /**
   * Undo for a removed dropdown option. The field is found by its key in the
   * latest definition, never by the sheet's selection, so this cannot write
   * into another field or revert other edits. Returns where the option landed,
   * or null when the field is gone or is no longer a dropdown.
   */
  function restoreDropdownOption(
    fieldKey: string,
    index: number,
    option: FormOption,
  ): number | null {
    const current = latestDefinition.current;
    const target = current.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === fieldKey);
    if (!target || target.type !== "select") return null;
    const result = restoreOption(target.options ?? [], index, option);
    onChange({
      ...current,
      sections: current.sections.map((section) => ({
        ...section,
        fields: section.fields.map((field) =>
          field.key === fieldKey ? { ...field, options: result.options } : field,
        ),
      })),
    });
    return result.index;
  }

  function removeField(step: FormStep, index: number) {
    const fields = fieldsInStep(latestDefinition.current, step);
    const removed = fields[index];
    if (!removed) return;
    const ids = rowIdsFor(step, fields.length);
    const removedId = ids[index];
    idsByStep.current[step] = ids.filter((_, itemIndex) => itemIndex !== index);
    setSelected((current) => (current?.id === removedId ? null : current));
    onChange(
      withStepFields(
        latestDefinition.current,
        step,
        fields.filter((_, itemIndex) => itemIndex !== index),
      ),
    );

    toast(`Removed “${removed.label}”`, {
      action: {
        label: "Undo",
        onClick: () => {
          const current = fieldsInStep(latestDefinition.current, step);
          if (current.some((field) => field.key === removed.key)) return;
          const at = Math.min(index, current.length);
          const restoredIds = [...rowIdsFor(step, current.length)];
          restoredIds.splice(at, 0, removedId);
          idsByStep.current[step] = restoredIds;
          const restored = [...current];
          restored.splice(at, 0, removed);
          onChange(withStepFields(latestDefinition.current, step, restored));
        },
      },
    });
  }

  /** Moves a question, unless that would put it above its own trigger. */
  function reorderField(step: FormStep, from: number, to: number) {
    const fields = fieldsInStep(definition, step);
    if (from === to || to < 0 || to >= fields.length) return;

    const next = arrayMove(fields, from, to);
    const before = misorderedKeys(fields);
    const introduced = [...misorderedKeys(next)].filter(
      (key) => !before.has(key),
    );
    if (introduced.length > 0) {
      const dependent = next.find((field) => field.key === introduced[0]);
      const source = next.find(
        (field) => field.key === dependent?.visibleWhen?.field,
      );
      const message = `“${dependent?.label}” only appears after “${source?.label}” is answered, so “${source?.label}” has to stay above it.`;
      toast.error("That question can't go there.", { description: message });
      setLiveMessage(message);
      return;
    }

    idsByStep.current[step] = arrayMove(
      rowIdsFor(step, fields.length),
      from,
      to,
    );
    onChange(withStepFields(definition, step, next));
    setLiveMessage(
      `Moved ${fields[from].label} to position ${to + 1} of ${fields.length}.`,
    );
  }

  function addField(step: FormStep, opener: HTMLElement | null) {
    const fields = fieldsInStep(definition, step);
    const id = mintId(step);
    idsByStep.current[step] = [...rowIdsFor(step, fields.length), id];
    onChange(
      withStepFields(definition, step, [
        ...fields,
        {
          key: nextFieldKey(definition),
          type: "text",
          label: "New field",
          required: false,
        },
      ]),
    );
    // Closing returns focus to the Add Field button; Safari does not focus a
    // button on click, so the library would otherwise drop focus to <body>.
    openerRef.current = opener;
    setSelected({ step, id });
  }

  function duplicateField(step: FormStep, index: number) {
    const current = latestDefinition.current;
    const fields = fieldsInStep(current, step);
    const source = fields[index];
    if (!source || source.blockKey || source.type === "person_group") return;

    // Deep copy so editing the copy (options, visibility) never touches the
    // original. A copy is always a local question, never a shared-block member.
    const copy = structuredClone(source);
    delete copy.blockKey;
    copy.key = nextFieldKey(current);
    copy.label = `${source.label.slice(0, 160 - COPY_SUFFIX.length)}${COPY_SUFFIX}`;

    const ids = rowIdsFor(step, fields.length);
    idsByStep.current[step] = [
      ...ids.slice(0, index + 1),
      mintId(step),
      ...ids.slice(index + 1),
    ];
    onChange(
      withStepFields(current, step, [
        ...fields.slice(0, index + 1),
        copy,
        ...fields.slice(index + 1),
      ]),
    );
    setLiveMessage(
      `Duplicated ${source.label}. The copy is at position ${index + 2} of ${fields.length + 1}.`,
    );
  }

  function openField(
    step: FormStep,
    id: string,
    opener: HTMLElement | null,
  ) {
    openerRef.current = opener;
    setSelected({ step, id });
  }

  function handleInspectorOpenChange(open: boolean) {
    if (open) return;
    setSelected(null);
    const opener = openerRef.current;
    openerRef.current = null;
    if (!opener) return;
    // Base UI only returns focus to whatever was focused when the sheet
    // mounted. That is wrong for the row menu (the menu item is gone by then)
    // and for Safari, which does not focus a button on click. Wait a frame so
    // we run after the close has been committed; the library then sees focus
    // already outside the sheet and leaves it alone.
    requestAnimationFrame(() => {
      if (opener.isConnected) opener.focus({ preventScroll: true });
    });
  }

  const selectedFields = selected
    ? fieldsInStep(definition, selected.step)
    : [];
  const selectedIndex = selected
    ? rowIdsFor(selected.step, selectedFields.length).indexOf(selected.id)
    : -1;
  const selectedField =
    selectedIndex >= 0 ? (selectedFields[selectedIndex] ?? null) : null;

  return (
    <div className="flex flex-col gap-5">
      <p role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </p>

      {stepsToShow.map((step) => {
        const fields = fieldsInStep(definition, step.value);
        const ids = rowIdsFor(step.value, fields.length);
        const stepBlocks = allowSharedBlocks
          ? blocks.filter((block) => block.step === step.value)
          : [];

        return (
          <section
            key={step.value}
            aria-labelledby={`${step.value}-step-heading`}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3
                  id={`${step.value}-step-heading`}
                  className="text-sm font-semibold text-foreground"
                >
                  {step.label}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {fields.length} {fields.length === 1 ? "field" : "fields"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {stepBlocks.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      nativeButton
                      render={
                        <Button type="button" variant="outline" size="sm" />
                      }
                    >
                      <Blocks data-icon="inline-start" />
                      Insert Shared Block
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-64">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>
                          Shared question blocks
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {stepBlocks.map((block) => {
                          const included = includedBlockKeys.has(block.blockKey);
                          return (
                            <DropdownMenuItem
                              key={block.blockKey}
                              disabled={included}
                              onClick={() => addBlock(block)}
                            >
                              <span className="flex flex-col gap-0.5">
                                <span>{block.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {included
                                    ? "Already in this form"
                                    : `${block.fields.length} ${block.fields.length === 1 ? "question" : "questions"}`}
                                </span>
                              </span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(event) => addField(step.value, event.currentTarget)}
                >
                  <Plus data-icon="inline-start" />
                  Add Field
                </Button>
              </div>
            </div>

            {fields.length === 0 ? (
              <Empty className="border border-dashed border-border py-6">
                <EmptyDescription>
                  No questions in this step yet. Add a field to start.
                </EmptyDescription>
              </Empty>
            ) : (
              <StepFieldTable
                stepLabel={step.label}
                step={step.value}
                fields={fields}
                ids={ids}
                selectedId={
                  selected?.step === step.value ? selected.id : null
                }
                blockNameByKey={blockNameByKey}
                onOpen={(id, opener) => openField(step.value, id, opener)}
                onReorder={(from, to) => reorderField(step.value, from, to)}
                onDuplicate={(index) => duplicateField(step.value, index)}
                onRemove={(index) => removeField(step.value, index)}
              />
            )}
          </section>
        );
      })}

      <FormFieldInspector
        open={selectedField !== null}
        onOpenChange={handleInspectorOpenChange}
        field={selectedField}
        fieldId={selected?.id}
        fields={selectedFields}
        index={selectedIndex}
        fieldTypes={fieldTypes}
        immutableKeys={immutableKeySet}
        blockNameByKey={blockNameByKey}
        onUpdate={(patch) => {
          if (selected && selectedIndex >= 0) {
            updateField(selected.step, selectedIndex, patch);
          }
        }}
        onDetach={detach}
        onRestoreOption={restoreDropdownOption}
        optionUsageFor={(fieldKey, value) =>
          optionUsage(definition, fieldKey, value, externalConditions)
        }
      />

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Eye aria-hidden="true" /> Preview Published Form Structure
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stepsToShow.map((step) => (
              <div
                key={step.value}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4"
              >
                <p className="text-sm font-semibold">{step.label}</p>
                {fieldsInStep(definition, step.value).map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span>{field.label}</span>
                    <span className="text-muted-foreground">
                      {field.required ? "Required" : "Optional"}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function StepFieldTable({
  stepLabel,
  step,
  fields,
  ids,
  selectedId,
  blockNameByKey,
  onOpen,
  onReorder,
  onDuplicate,
  onRemove,
}: {
  stepLabel: string;
  step: FormStep;
  fields: FormFieldDefinition[];
  ids: string[];
  selectedId: string | null;
  blockNameByKey: Map<string, string>;
  onOpen: (id: string, opener: HTMLElement | null) => void;
  onReorder: (from: number, to: number) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const labelOf = (id: string | number) =>
    fields[ids.indexOf(String(id))]?.label ?? "Question";
  const positionOf = (id: string | number) => ids.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${labelOf(active.id)}, position ${positionOf(active.id)} of ${fields.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${labelOf(active.id)} is over position ${positionOf(over.id)} of ${fields.length}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${labelOf(active.id)} at position ${positionOf(over.id)} of ${fields.length}.`
        : `Dropped ${labelOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${labelOf(active.id)} stays at position ${positionOf(active.id)}.`,
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onReorder(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  }

  return (
    <DndContext
      id={`fields-${step}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="rounded-lg border border-border">
          <Table aria-label={`${stepLabel} questions`}>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <span className="sr-only">Reorder</span>
                </TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="hidden md:table-cell">Key</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Visibility
                </TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <FieldRow
                  key={ids[index]}
                  id={ids[index]}
                  field={field}
                  fields={fields}
                  index={index}
                  selected={ids[index] === selectedId}
                  blockName={
                    field.blockKey
                      ? (blockNameByKey.get(field.blockKey) ?? field.blockKey)
                      : null
                  }
                  onOpen={(opener) => onOpen(ids[index], opener)}
                  onMoveBy={(direction) =>
                    onReorder(index, index + direction)
                  }
                  onDuplicate={() => onDuplicate(index)}
                  onRemove={() => onRemove(index)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function FieldRow({
  id,
  field,
  fields,
  index,
  selected,
  blockName,
  onOpen,
  onMoveBy,
  onDuplicate,
  onRemove,
}: {
  id: string;
  field: FormFieldDefinition;
  fields: FormFieldDefinition[];
  index: number;
  selected: boolean;
  blockName: string | null;
  onOpen: (opener: HTMLElement | null) => void;
  onMoveBy: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const nameButtonRef = useRef<HTMLButtonElement>(null);
  const locked = Boolean(field.blockKey);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: locked });
  const visibility = describeVisibility(field, fields, index);

  return (
    <TableRow
      ref={setNodeRef}
      data-state={selected ? "selected" : undefined}
      style={{
        // Rows only travel vertically; the table owns the horizontal layout.
        transform: CSS.Translate.toString(
          transform ? { ...transform, x: 0 } : null,
        ),
        transition,
      }}
      className={cn(isDragging && "relative z-10 bg-background shadow-md")}
    >
      <TableCell className="w-10 pr-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          ref={setActivatorNodeRef}
          disabled={locked}
          title={locked ? "Part of a shared block" : undefined}
          aria-label={`Reorder ${field.label}`}
          className="relative size-9 touch-none cursor-grab text-muted-foreground after:absolute after:-inset-1 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" />
        </Button>
      </TableCell>

      <TableCell className="whitespace-normal">
        <button
          type="button"
          ref={nameButtonRef}
          aria-current={selected ? "true" : undefined}
          onClick={(event) => onOpen(event.currentTarget)}
          className="group/name -mx-1 flex min-h-11 w-full items-center gap-3 rounded-md px-1 py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <FormFieldIcon type={field.type} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium break-words text-foreground underline-offset-4 group-hover/name:underline">
              {field.label}
            </span>
            {blockName ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Blocks aria-hidden="true" className="size-3" />
                Shared · {blockName}
              </span>
            ) : null}
          </span>
        </button>
      </TableCell>

      <TableCell className="hidden md:table-cell">
        <span
          translate="no"
          className="font-mono text-xs text-muted-foreground"
        >
          {field.key}
        </span>
      </TableCell>

      <TableCell className="hidden sm:table-cell">
        <Badge variant="secondary">{fieldTypeLabel(field.type)}</Badge>
      </TableCell>

      <TableCell>
        {field.required ? (
          <Badge>Required</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </TableCell>

      <TableCell className="hidden max-w-64 whitespace-normal lg:table-cell">
        {visibility ? (
          <span
            className={cn(
              "flex items-start gap-1.5 text-xs",
              visibility.misordered
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            <GitBranch aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            <span className="min-w-0 break-words">
              {visibility.misordered
                ? `Depends on a question below: ${visibility.text}`
                : `Shown when ${visibility.text}`}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Always shown</span>
        )}
      </TableCell>

      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative size-9 text-muted-foreground after:absolute after:-inset-1"
                aria-label={`Actions for ${field.label}`}
              />
            }
          >
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={() => onOpen(nameButtonRef.current)}>
              <Pencil aria-hidden="true" />
              Edit Field
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={locked || index === 0}
              onClick={() => onMoveBy(-1)}
            >
              <ArrowUp aria-hidden="true" />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={locked || index === fields.length - 1}
              onClick={() => onMoveBy(1)}
            >
              <ArrowDown aria-hidden="true" />
              Move Down
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={locked || field.type === "person_group"}
              onClick={onDuplicate}
            >
              <Copy aria-hidden="true" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={locked || field.type === "person_group"}
              className="text-destructive focus:text-destructive"
              onClick={onRemove}
            >
              <Trash2 aria-hidden="true" />
              Remove Field
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
