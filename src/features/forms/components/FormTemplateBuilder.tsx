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
  FormStep,
  FormTemplateDefinition,
} from "../form-template.types";
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
    const fields = fieldsInStep(definition, step);
    fields[index] = { ...fields[index], ...patch };
    onChange(withStepFields(definition, step, fields));
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

  function addField(step: FormStep) {
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
    setSelected({ step, id });
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
                  onClick={() => addField(step.value)}
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
                onOpen={(id) => setSelected({ step: step.value, id })}
                onReorder={(from, to) => reorderField(step.value, from, to)}
                onRemove={(index) => removeField(step.value, index)}
              />
            )}
          </section>
        );
      })}

      <FormFieldInspector
        open={selectedField !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        field={selectedField}
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
  onRemove,
}: {
  stepLabel: string;
  step: FormStep;
  fields: FormFieldDefinition[];
  ids: string[];
  selectedId: string | null;
  blockNameByKey: Map<string, string>;
  onOpen: (id: string) => void;
  onReorder: (from: number, to: number) => void;
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
                  onOpen={() => onOpen(ids[index])}
                  onMoveBy={(direction) =>
                    onReorder(index, index + direction)
                  }
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
  onRemove,
}: {
  id: string;
  field: FormFieldDefinition;
  fields: FormFieldDefinition[];
  index: number;
  selected: boolean;
  blockName: string | null;
  onOpen: () => void;
  onMoveBy: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
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
      className={cn(
        "cursor-pointer",
        isDragging && "relative z-10 bg-background shadow-md",
      )}
      onClick={onOpen}
    >
      <TableCell
        className="w-10 pr-0"
        onClick={(event) => event.stopPropagation()}
      >
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
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <FormFieldIcon type={field.type} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <Button
              type="button"
              variant="link"
              aria-current={selected ? "true" : undefined}
              className="h-auto min-h-11 justify-start p-0 text-left font-medium break-words whitespace-normal text-foreground"
            >
              {field.label}
            </Button>
            {blockName ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Blocks aria-hidden="true" className="size-3" />
                Shared · {blockName}
              </span>
            ) : null}
          </span>
        </div>
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
                : `Only if ${visibility.text}`}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Always shown</span>
        )}
      </TableCell>

      <TableCell onClick={(event) => event.stopPropagation()}>
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
            <DropdownMenuItem onClick={onOpen}>
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
