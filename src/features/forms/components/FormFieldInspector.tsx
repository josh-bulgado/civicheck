import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Blocks, Plus, Trash2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { deriveOptionValue } from "../form-option-usage";
import type {
  FormFieldDefinition,
  FormFieldType,
  FormOption,
} from "../form-template.types";
import { ConditionRuleBuilder } from "./ConditionRuleBuilder";
import { fieldTypeLabel, type FormFieldTypeOption } from "./form-field-types";

interface FormFieldInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FormFieldDefinition | null;
  /**
   * Stable id of the opened row. It does not change while the admin edits the
   * field key, so editor state is scoped to the opened field, not its key.
   */
  fieldId?: string;
  /** Every field of the same step, in order. */
  fields: FormFieldDefinition[];
  /** Position of `field` within `fields`. */
  index: number;
  fieldTypes: FormFieldTypeOption[];
  immutableKeys: Set<string>;
  blockNameByKey: Map<string, string>;
  onUpdate: (patch: Partial<FormFieldDefinition>) => void;
  onDetach: (blockKey: string) => void;
  /**
   * Puts a removed dropdown option back into the field with this key. Returns
   * the index it landed at, or null when the field no longer exists.
   */
  onRestoreOption: RestoreOption;
  /**
   * Where a dropdown option is relied on (conditions, routing, requirements),
   * as short descriptions. Empty means unused. Defaults to "never in use".
   */
  optionUsageFor?: OptionUsageFor;
}

type RestoreOption = (
  fieldKey: string,
  index: number,
  option: FormOption,
) => number | null;

type OptionUsageFor = (fieldKey: string, value: string) => string[];

const NEVER_IN_USE: OptionUsageFor = () => [];

const DATE_DIRECTIONS = [
  { value: "past", label: "Past dates only" },
  { value: "future", label: "Future dates only" },
  { value: "any", label: "Any date" },
] as const;

const LEGEND_CLASS =
  "text-xs font-semibold tracking-wide text-muted-foreground uppercase";

/**
 * Edits one application question in a side sheet, so the list stays in view
 * behind it. Changes apply to the draft immediately; nothing is saved until the
 * service itself is published.
 */
export function FormFieldInspector({
  open,
  onOpenChange,
  field,
  fieldId,
  fields,
  index,
  fieldTypes,
  immutableKeys,
  blockNameByKey,
  onUpdate,
  onDetach,
  onRestoreOption,
  optionUsageFor = NEVER_IN_USE,
}: FormFieldInspectorProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {field ? (
          <>
            <SheetHeader className="border-b border-border pr-14">
              <SheetTitle className="text-pretty">{field.label}</SheetTitle>
              <SheetDescription>
                <span translate="no" className="font-mono text-xs">
                  {field.key}
                </span>
                {" · "}
                {fieldTypeLabel(field.type)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4">
              {field.blockKey ? (
                <SharedBlockNotice
                  blockKey={field.blockKey}
                  name={blockNameByKey.get(field.blockKey)}
                  onDetach={() => onDetach(field.blockKey!)}
                />
              ) : (
                <FieldEditor
                  field={field}
                  fieldId={fieldId}
                  fields={fields}
                  index={index}
                  fieldTypes={fieldTypes}
                  immutableKeys={immutableKeys}
                  onUpdate={onUpdate}
                  onRestoreOption={onRestoreOption}
                  optionUsageFor={optionUsageFor}
                />
              )}
            </div>

            <SheetFooter className="flex-row justify-end border-t border-border">
              <Button
                type="button"
                className="min-h-11"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SharedBlockNotice({
  blockKey,
  name,
  onDetach,
}: {
  blockKey: string;
  name: string | undefined;
  onDetach: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        This question belongs to the shared block{" "}
        <span className="font-medium text-foreground">{name ?? blockKey}</span>.
        Edit it once there and every form that includes the block is updated.
        Detach it to customise it for this form only.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/admin/services/blocks"
          search={{ block: blockKey }}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Blocks data-icon="inline-start" />
          Edit Shared Block
        </Link>
        <Button type="button" variant="ghost" size="sm" onClick={onDetach}>
          <Unlink data-icon="inline-start" />
          Detach From Block
        </Button>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  fieldId,
  fields,
  index,
  fieldTypes,
  immutableKeys,
  onUpdate,
  onRestoreOption,
  optionUsageFor,
}: {
  field: FormFieldDefinition;
  fieldId: string | undefined;
  fields: FormFieldDefinition[];
  index: number;
  fieldTypes: FormFieldTypeOption[];
  immutableKeys: Set<string>;
  onUpdate: (patch: Partial<FormFieldDefinition>) => void;
  onRestoreOption: RestoreOption;
  optionUsageFor: OptionUsageFor;
}) {
  const hasOtherPersonGroup = fields.some(
    (candidate) => candidate !== field && candidate.type === "person_group",
  );
  const typeOptions = fieldTypes.filter(
    (type) =>
      type.value !== "person_group" ||
      field.type === "person_group" ||
      !hasOtherPersonGroup,
  );
  // Leaving "dropdown" drops its options, which would strand any condition,
  // route or requirement that still points at one of them.
  const typeLockedByUsage =
    field.type === "select" &&
    (field.options ?? []).some(
      (option) => optionUsageFor(field.key, option.value).length > 0,
    );
  const earlierSelects = fields
    .slice(0, index)
    .filter((candidate) => candidate.type === "select");

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="inspector-label">Label</FieldLabel>
        <Input
          id="inspector-label"
          name="field_label"
          value={field.label}
          autoComplete="off"
          onChange={(event) => onUpdate({ label: event.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="inspector-key">Stable Field Key</FieldLabel>
        <Input
          id="inspector-key"
          name="field_key"
          value={field.key}
          disabled={immutableKeys.has(field.key)}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          onChange={(event) =>
            onUpdate({
              key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
            })
          }
        />
        <FieldDescription>
          {immutableKeys.has(field.key)
            ? "Locked because this key exists in a published version."
            : "The key becomes locked after the first publication."}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="inspector-type">Field Type</FieldLabel>
        <Select
          items={typeOptions}
          value={field.type}
          disabled={typeLockedByUsage}
          onValueChange={(value) =>
            onUpdate({
              type: value as FormFieldType,
              options:
                value === "select"
                  ? field.options?.length
                    ? field.options
                    : [{ value: "option_1", label: "Option 1" }]
                  : undefined,
            })
          }
        >
          <SelectTrigger
            id="inspector-type"
            className="w-full"
            aria-describedby={typeLockedByUsage ? "inspector-type-lock" : undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {typeOptions.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {typeLockedByUsage ? (
          <FieldDescription id="inspector-type-lock">
            Locked because a condition, route or requirement uses one of the
            dropdown options.
          </FieldDescription>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="inspector-placeholder">Placeholder</FieldLabel>
        <Input
          id="inspector-placeholder"
          name="field_placeholder"
          value={field.placeholder ?? ""}
          autoComplete="off"
          onChange={(event) => onUpdate({ placeholder: event.target.value })}
        />
      </Field>

      <Field orientation="horizontal">
        <Checkbox
          id="inspector-required"
          checked={field.required}
          onCheckedChange={(checked) => onUpdate({ required: checked === true })}
        />
        <FieldLabel htmlFor="inspector-required">
          Applicant must answer this field
        </FieldLabel>
      </Field>

      {field.type === "date" ? (
        <Field>
          <FieldLabel htmlFor="inspector-date-direction">
            Date Restriction
          </FieldLabel>
          <Select
            items={DATE_DIRECTIONS as unknown as { value: string; label: string }[]}
            value={field.dateDirection ?? "any"}
            onValueChange={(value) =>
              onUpdate({
                dateDirection: value as "past" | "future" | "any",
              })
            }
          >
            <SelectTrigger id="inspector-date-direction" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {DATE_DIRECTIONS.map((direction) => (
                  <SelectItem key={direction.value} value={direction.value}>
                    {direction.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {field.type === "select" ? (
        <DropdownOptionsEditor
          key={fieldId ?? index}
          field={field}
          usageFor={optionUsageFor}
          onUpdate={onUpdate}
          onRestoreOption={onRestoreOption}
        />
      ) : null}

      {field.visibleWhen ||
      (earlierSelects.length > 0 && field.type !== "person_group") ? (
        <FieldSet className="min-w-0">
          <FieldLegend variant="label" className={LEGEND_CLASS}>
            Show When
          </FieldLegend>
          <ConditionRuleBuilder
            idPrefix="inspector-condition"
            single
            lead="Show when"
            emptyLabel="Always shown."
            sources={earlierSelects.map((candidate) => ({
              key: candidate.key,
              label: candidate.label,
              options: candidate.options,
            }))}
            rule={
              field.visibleWhen
                ? { match: "all", conditions: [field.visibleWhen] }
                : null
            }
            onChange={(rule) =>
              onUpdate({ visibleWhen: rule?.conditions[0] })
            }
          />
        </FieldSet>
      ) : null}
    </FieldGroup>
  );
}

/**
 * The dropdown's choices. A choice that a condition, route or requirement relies
 * on keeps its stored value and cannot be removed (conditions store the value,
 * never the label, so the label stays freely editable). A choice added here
 * follows its label until the admin edits the value by hand.
 */
function DropdownOptionsEditor({
  field,
  usageFor,
  onUpdate,
  onRestoreOption,
}: {
  field: FormFieldDefinition;
  usageFor: OptionUsageFor;
  onUpdate: (patch: Partial<FormFieldDefinition>) => void;
  onRestoreOption: RestoreOption;
}) {
  const options = field.options ?? [];
  // Options have no id and the saved shape must not gain one, so rows that are
  // still "auto-valued" are tracked by index and shifted on remove/restore.
  // Choices that came from saved data are never in this set.
  const [autoRows, setAutoRows] = useState<ReadonlySet<number>>(new Set());
  const latestOptions = useRef(options);
  latestOptions.current = options;

  function takenValues(skip: number) {
    return new Set(
      latestOptions.current
        .filter((_, itemIndex) => itemIndex !== skip)
        .map((option) => option.value),
    );
  }

  function replaceOption(optionIndex: number, patch: Partial<FormOption>) {
    const next = [...options];
    next[optionIndex] = { ...options[optionIndex], ...patch };
    onUpdate({ options: next });
  }

  function addOption() {
    const label = `Option ${options.length + 1}`;
    const value = deriveOptionValue(
      label,
      new Set(options.map((option) => option.value)),
    );
    setAutoRows((rows) => new Set(rows).add(options.length));
    onUpdate({ options: [...options, { value, label }] });
  }

  function removeOption(optionIndex: number) {
    const removed = options[optionIndex];
    const wasAuto = autoRows.has(optionIndex);
    setAutoRows((rows) => shiftRows(rows, optionIndex, -1));
    onUpdate({ options: options.filter((_, item) => item !== optionIndex) });
    // Undo goes through the builder, which resolves this field by key in its
    // latest definition. Nothing here is replayed from a stale render.
    const fieldKey = field.key;
    toast(`Removed \u201c${removed.label}\u201d`, {
      action: {
        label: "Undo",
        onClick: () => {
          const at = onRestoreOption(fieldKey, optionIndex, removed);
          if (at === null) return;
          // No-op if this editor has since unmounted.
          setAutoRows((rows) => {
            const shifted = shiftRows(rows, at, 1);
            if (wasAuto) shifted.add(at);
            return shifted;
          });
        },
      },
    });
  }

  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label" className="mb-1">
        Dropdown Options
      </FieldLegend>
      {options.map((option, optionIndex) => {
        const usage = usageFor(field.key, option.value);
        const inUse = usage.length > 0;
        const usageId = `inspector-option-${optionIndex}-usage`;
        return (
          <div key={optionIndex} className="flex flex-col gap-1">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={option.value}
                readOnly={inUse}
                aria-readonly={inUse || undefined}
                autoComplete="off"
                spellCheck={false}
                className={
                  inUse
                    ? "bg-muted/50 font-mono text-muted-foreground"
                    : "font-mono"
                }
                aria-label={`Option ${optionIndex + 1} value`}
                aria-describedby={inUse ? usageId : undefined}
                onChange={(event) => {
                  setAutoRows((rows) => shiftRows(rows, optionIndex, 0));
                  replaceOption(optionIndex, { value: event.target.value });
                }}
              />
              <Input
                value={option.label}
                autoComplete="off"
                aria-label={`Option ${optionIndex + 1} label`}
                onChange={(event) => {
                  const label = event.target.value;
                  replaceOption(
                    optionIndex,
                    !inUse && autoRows.has(optionIndex)
                      ? {
                          label,
                          value: deriveOptionValue(
                            label,
                            takenValues(optionIndex),
                          ),
                        }
                      : { label },
                  );
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={inUse}
                onClick={() => removeOption(optionIndex)}
                aria-label={`Remove option ${optionIndex + 1}`}
                aria-describedby={inUse ? usageId : undefined}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            {inUse ? (
              <p id={usageId} className="text-xs text-muted-foreground">
                Used by: {usage.join("; ")}
              </p>
            ) : null}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={addOption}
      >
        <Plus aria-hidden="true" data-icon="inline-start" />
        Add Option
      </Button>
    </FieldSet>
  );
}

/**
 * Re-indexes the auto-valued rows after a row at `at` is removed (`delta` -1:
 * rows after it move up, `at` itself is dropped), inserted (`delta` 1: rows from
 * `at` move down), or its value is touched by hand (`delta` 0: `at` is dropped).
 */
function shiftRows(
  rows: ReadonlySet<number>,
  at: number,
  delta: -1 | 0 | 1,
): Set<number> {
  const next = new Set<number>();
  for (const row of rows) {
    if (delta === 0) {
      if (row !== at) next.add(row);
    } else if (delta === -1) {
      if (row < at) next.add(row);
      else if (row > at) next.add(row - 1);
    } else {
      next.add(row >= at ? row + 1 : row);
    }
  }
  return next;
}
