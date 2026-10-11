import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Blocks,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Trash2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  listInsertableBlocksFn,
  type FormFieldBlockRecord,
} from "../form-field-block.functions";
import { detachBlock, insertBlock } from "../form-field-block.utils";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
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
import type {
  FormFieldDefinition,
  FormFieldType,
  FormStep,
  FormTemplateDefinition,
} from "../form-template.types";

const FIELD_TYPES: Array<{ value: FormFieldType; label: string }> = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "date", label: "Date" },
  { value: "phone", label: "Philippine mobile number" },
  { value: "select", label: "Dropdown" },
  { value: "person_group", label: "Person name group" },
];

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
  const firstIndex = definition.sections.findIndex((section) => section.step === step);
  if (firstIndex === -1) {
    return {
      ...definition,
      sections: [
        ...definition.sections,
        { key: step, step, title: step === "case" ? "Case details" : "Your details", fields },
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
  const used = new Set(definition.sections.flatMap((section) => section.fields.map((field) => field.key)));
  let index = 1;
  while (used.has(`custom_field_${index}`)) index += 1;
  return `custom_field_${index}`;
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
      section.fields.flatMap((field) => (field.blockKey ? [field.blockKey] : [])),
    ),
  );

  function addBlock(block: FormFieldBlockRecord) {
    const result = insertBlock(definition, block);
    if (!result.ok) {
      toast.error("Can't add this shared block.", { description: result.reason });
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
    const fields = fieldsInStep(definition, step);
    onChange(withStepFields(definition, step, fields.filter((_, fieldIndex) => fieldIndex !== index)));
  }

  function moveField(step: FormStep, index: number, direction: -1 | 1) {
    const fields = fieldsInStep(definition, step);
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    onChange(withStepFields(definition, step, fields));
  }

  function addField(step: FormStep) {
    const fields = fieldsInStep(definition, step);
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
  }

  return (
    <div className="flex flex-col gap-5">
      {stepsToShow.map((step) => {
        const fields = fieldsInStep(definition, step.value);
        const stepBlocks = allowSharedBlocks
          ? blocks.filter((block) => block.step === step.value)
          : [];
        return (
          <section key={step.value} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {fields.length} {fields.length === 1 ? "field" : "fields"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {stepBlocks.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      nativeButton
                      render={<Button type="button" variant="outline" size="sm" />}
                    >
                      <Blocks data-icon="inline-start" />
                      Insert shared block
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-64">
                      <DropdownMenuLabel>Shared question blocks</DropdownMenuLabel>
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                <Button type="button" variant="outline" size="sm" onClick={() => addField(step.value)}>
                  <Plus data-icon="inline-start" />
                  Add field
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {fields.map((field, index) => (
                <Collapsible key={`${step.value}-${field.key}-${index}`}>
                  <div className="rounded-lg border border-border bg-background">
                    <div className="flex items-center gap-2 p-3">
                      <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <ChevronDown className="shrink-0" aria-hidden="true" />
                        <span className="truncate text-sm font-medium">{field.label}</span>
                        <Badge variant="secondary">{FIELD_TYPES.find((item) => item.value === field.type)?.label}</Badge>
                        {field.required ? <Badge>Required</Badge> : null}
                        {field.visibleWhen ? <Badge variant="outline">Conditional</Badge> : null}
                        {field.blockKey ? (
                          <Badge variant="outline">
                            <Blocks data-icon="inline-start" />
                            Shared · {blockNameByKey.get(field.blockKey) ?? field.blockKey}
                          </Badge>
                        ) : null}
                      </CollapsibleTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === 0 || Boolean(field.blockKey)}
                        onClick={() => moveField(step.value, index, -1)}
                        aria-label={`Move ${field.label} up`}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === fields.length - 1 || Boolean(field.blockKey)}
                        onClick={() => moveField(step.value, index, 1)}
                        aria-label={`Move ${field.label} down`}
                      >
                        <ChevronDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={field.type === "person_group" || Boolean(field.blockKey)}
                        onClick={() => removeField(step.value, index)}
                        aria-label={`Remove ${field.label}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <CollapsibleContent className="border-t border-border p-4">
                      {field.blockKey ? (
                        <div className="flex flex-col gap-3">
                          <p className="text-sm text-muted-foreground">
                            This question belongs to the shared block{" "}
                            <span className="font-medium text-foreground">
                              {blockNameByKey.get(field.blockKey) ?? field.blockKey}
                            </span>
                            . Edit it once there and every form that includes the
                            block is updated. Detach it to customise it for this
                            form only.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to="/admin/services/blocks"
                              search={{ block: field.blockKey }}
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              <Blocks data-icon="inline-start" />
                              Edit shared block
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => detach(field.blockKey!)}
                            >
                              <Unlink data-icon="inline-start" />
                              Detach from block
                            </Button>
                          </div>
                        </div>
                      ) : (
                      <FieldGroup>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor={`${step.value}-${index}-label`}>Label</FieldLabel>
                            <Input
                              id={`${step.value}-${index}-label`}
                              value={field.label}
                              onChange={(event) =>
                                updateField(step.value, index, { label: event.target.value })
                              }
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`${step.value}-${index}-key`}>Stable field key</FieldLabel>
                            <Input
                              id={`${step.value}-${index}-key`}
                              value={field.key}
                              disabled={immutableKeySet.has(field.key)}
                              onChange={(event) =>
                                updateField(step.value, index, {
                                  key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                                })
                              }
                            />
                            <FieldDescription>
                              {immutableKeySet.has(field.key)
                                ? "Locked because this key exists in a published version."
                                : "The key becomes locked after the first publication."}
                            </FieldDescription>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`${step.value}-${index}-type`}>Field type</FieldLabel>
                            <Select
                              items={fieldTypes.filter(
                                (type) =>
                                  type.value !== "person_group" ||
                                  field.type === "person_group" ||
                                  !fields.some((candidate) => candidate.type === "person_group"),
                              )}
                              value={field.type}
                              onValueChange={(value) =>
                                updateField(step.value, index, {
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
                              <SelectTrigger id={`${step.value}-${index}-type`} className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {fieldTypes.filter(
                                    (type) =>
                                      type.value !== "person_group" ||
                                      field.type === "person_group" ||
                                      !fields.some((candidate) => candidate.type === "person_group"),
                                  ).map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`${step.value}-${index}-placeholder`}>Placeholder</FieldLabel>
                            <Input
                              id={`${step.value}-${index}-placeholder`}
                              value={field.placeholder ?? ""}
                              onChange={(event) =>
                                updateField(step.value, index, { placeholder: event.target.value })
                              }
                            />
                          </Field>
                        </div>

                        <Field orientation="horizontal">
                          <Checkbox
                            id={`${step.value}-${index}-required`}
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              updateField(step.value, index, { required: checked === true })
                            }
                          />
                          <FieldLabel htmlFor={`${step.value}-${index}-required`}>
                            Applicant must answer this field
                          </FieldLabel>
                        </Field>

                        {field.type === "date" ? (
                          <Field>
                            <FieldLabel>Date restriction</FieldLabel>
                            <Select
                              items={[
                                { value: "past", label: "Past dates only" },
                                { value: "future", label: "Future dates only" },
                                { value: "any", label: "Any date" },
                              ]}
                              value={field.dateDirection ?? "any"}
                              onValueChange={(value) =>
                                updateField(step.value, index, {
                                  dateDirection: value as "past" | "future" | "any",
                                })
                              }
                            >
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectGroup>
                                <SelectItem value="past">Past dates only</SelectItem>
                                <SelectItem value="future">Future dates only</SelectItem>
                                <SelectItem value="any">Any date</SelectItem>
                              </SelectGroup></SelectContent>
                            </Select>
                          </Field>
                        ) : null}

                        {field.type === "select" ? (
                          <div className="flex flex-col gap-2">
                            <FieldLabel>Dropdown options</FieldLabel>
                            {(field.options ?? []).map((option, optionIndex) => (
                              <div key={`${option.value}-${optionIndex}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                <Input
                                  value={option.value}
                                  aria-label={`Option ${optionIndex + 1} value`}
                                  onChange={(event) => {
                                    const options = [...(field.options ?? [])];
                                    options[optionIndex] = { ...option, value: event.target.value };
                                    updateField(step.value, index, { options });
                                  }}
                                />
                                <Input
                                  value={option.label}
                                  aria-label={`Option ${optionIndex + 1} label`}
                                  onChange={(event) => {
                                    const options = [...(field.options ?? [])];
                                    options[optionIndex] = { ...option, label: event.target.value };
                                    updateField(step.value, index, { options });
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() =>
                                    updateField(step.value, index, {
                                      options: (field.options ?? []).filter((_, itemIndex) => itemIndex !== optionIndex),
                                    })
                                  }
                                  aria-label={`Remove option ${optionIndex + 1}`}
                                >
                                  <Trash2 />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="self-start"
                              onClick={() =>
                                updateField(step.value, index, {
                                  options: [
                                    ...(field.options ?? []),
                                    { value: `option_${(field.options?.length ?? 0) + 1}`, label: `Option ${(field.options?.length ?? 0) + 1}` },
                                  ],
                                })
                              }
                            >
                              <Plus data-icon="inline-start" /> Add option
                            </Button>
                          </div>
                        ) : null}

                        {field.visibleWhen ? (
                          <FieldGroup className="gap-3 rounded-lg border border-border p-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                Conditional visibility
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Reveal this question only after the applicant selects the matching answer.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Field>
                              <FieldLabel>Earlier question</FieldLabel>
                              <Select
                                items={fields.slice(0, index).filter((candidate) => candidate.type === "select").map((candidate) => ({ value: candidate.key, label: candidate.label }))}
                                value={field.visibleWhen.field}
                                onValueChange={(value) => {
                                  const source = fields.find((candidate) => candidate.key === value);
                                  updateField(step.value, index, {
                                    visibleWhen: {
                                      ...field.visibleWhen!,
                                      field: value ?? "",
                                      value: source?.options?.[0]?.value ?? "",
                                    },
                                  });
                                }}
                              >
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectGroup>
                                  {fields.slice(0, index).filter((candidate) => candidate.type === "select").map((candidate) => (
                                    <SelectItem key={candidate.key} value={candidate.key}>{candidate.label}</SelectItem>
                                  ))}
                                </SelectGroup></SelectContent>
                              </Select>
                            </Field>
                            <Field>
                              <FieldLabel>Comparison</FieldLabel>
                              <Select
                                items={[{ value: "equals", label: "Equals" }, { value: "not_equals", label: "Does not equal" }]}
                                value={field.visibleWhen.operator}
                                onValueChange={(value) => updateField(step.value, index, { visibleWhen: { ...field.visibleWhen!, operator: value as "equals" | "not_equals" } })}
                              >
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectGroup>
                                  <SelectItem value="equals">Equals</SelectItem>
                                  <SelectItem value="not_equals">Does not equal</SelectItem>
                                </SelectGroup></SelectContent>
                              </Select>
                            </Field>
                            <Field>
                              <FieldLabel>Selected answer</FieldLabel>
                              {fields.find((candidate) => candidate.key === field.visibleWhen?.field)?.options?.length ? (
                                <Select
                                  value={field.visibleWhen.value}
                                  onValueChange={(value) =>
                                    updateField(step.value, index, {
                                      visibleWhen: { ...field.visibleWhen!, value: value ?? "" },
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectGroup>
                                    {fields.find((candidate) => candidate.key === field.visibleWhen?.field)?.options?.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                  </SelectGroup></SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={field.visibleWhen.value}
                                  onChange={(event) => updateField(step.value, index, { visibleWhen: { ...field.visibleWhen!, value: event.target.value } })}
                                />
                              )}
                            </Field>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="self-start"
                              onClick={() => updateField(step.value, index, { visibleWhen: undefined })}
                            >
                              Remove condition
                            </Button>
                          </FieldGroup>
                        ) : fields.slice(0, index).some(
                            (candidate) => candidate.type === "select",
                          ) && field.type !== "person_group" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="self-start"
                            onClick={() => {
                              const source = fields.slice(0, index).find((candidate) => candidate.type === "select")!;
                              updateField(step.value, index, {
                                visibleWhen: {
                                  field: source.key,
                                  operator: "equals",
                                  value: source.options?.[0]?.value ?? "",
                                },
                              });
                            }}
                          >
                            Show this question conditionally
                          </Button>
                        ) : null}
                      </FieldGroup>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </section>
        );
      })}

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Eye aria-hidden="true" /> Preview published form structure
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stepsToShow.map((step) => (
              <div key={step.value} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold">{step.label}</p>
                {fieldsInStep(definition, step.value).map((field) => (
                  <div key={field.key} className="flex items-center justify-between gap-2 text-xs">
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
