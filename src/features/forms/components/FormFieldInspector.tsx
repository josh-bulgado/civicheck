import { Link } from "@tanstack/react-router";
import { Blocks, Plus, Trash2, Unlink } from "lucide-react";
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
import type {
  FormFieldDefinition,
  FormFieldType,
} from "../form-template.types";
import { ConditionRuleBuilder } from "./ConditionRuleBuilder";
import { fieldTypeLabel, type FormFieldTypeOption } from "./form-field-types";

interface FormFieldInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FormFieldDefinition | null;
  /** Every field of the same step, in order. */
  fields: FormFieldDefinition[];
  /** Position of `field` within `fields`. */
  index: number;
  fieldTypes: FormFieldTypeOption[];
  immutableKeys: Set<string>;
  blockNameByKey: Map<string, string>;
  onUpdate: (patch: Partial<FormFieldDefinition>) => void;
  onDetach: (blockKey: string) => void;
}

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
  fields,
  index,
  fieldTypes,
  immutableKeys,
  blockNameByKey,
  onUpdate,
  onDetach,
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
                  fields={fields}
                  index={index}
                  fieldTypes={fieldTypes}
                  immutableKeys={immutableKeys}
                  onUpdate={onUpdate}
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
  fields,
  index,
  fieldTypes,
  immutableKeys,
  onUpdate,
}: {
  field: FormFieldDefinition;
  fields: FormFieldDefinition[];
  index: number;
  fieldTypes: FormFieldTypeOption[];
  immutableKeys: Set<string>;
  onUpdate: (patch: Partial<FormFieldDefinition>) => void;
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
          <SelectTrigger id="inspector-type" className="w-full">
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
        <FieldSet className="gap-2">
          <FieldLegend variant="label" className="mb-1">
            Dropdown Options
          </FieldLegend>
          {(field.options ?? []).map((option, optionIndex) => (
            <div
              key={optionIndex}
              className="grid grid-cols-[1fr_1fr_auto] gap-2"
            >
              <Input
                value={option.value}
                autoComplete="off"
                spellCheck={false}
                aria-label={`Option ${optionIndex + 1} value`}
                onChange={(event) => {
                  const options = [...(field.options ?? [])];
                  options[optionIndex] = {
                    ...option,
                    value: event.target.value,
                  };
                  onUpdate({ options });
                }}
              />
              <Input
                value={option.label}
                autoComplete="off"
                aria-label={`Option ${optionIndex + 1} label`}
                onChange={(event) => {
                  const options = [...(field.options ?? [])];
                  options[optionIndex] = {
                    ...option,
                    label: event.target.value,
                  };
                  onUpdate({ options });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  onUpdate({
                    options: (field.options ?? []).filter(
                      (_, itemIndex) => itemIndex !== optionIndex,
                    ),
                  })
                }
                aria-label={`Remove option ${optionIndex + 1}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              onUpdate({
                options: [
                  ...(field.options ?? []),
                  {
                    value: `option_${(field.options?.length ?? 0) + 1}`,
                    label: `Option ${(field.options?.length ?? 0) + 1}`,
                  },
                ],
              })
            }
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add Option
          </Button>
        </FieldSet>
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
