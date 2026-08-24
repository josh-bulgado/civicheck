import {
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
}: {
  definition: FormTemplateDefinition;
  onChange: (definition: FormTemplateDefinition) => void;
  immutableKeys?: string[];
}) {
  const immutableKeySet = new Set(immutableKeys);

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
      {STEPS.map((step) => {
        const fields = fieldsInStep(definition, step.value);
        return (
          <section key={step.value} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {fields.length} {fields.length === 1 ? "field" : "fields"}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => addField(step.value)}>
                <Plus data-icon="inline-start" />
                Add field
              </Button>
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
                      </CollapsibleTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === 0}
                        onClick={() => moveField(step.value, index, -1)}
                        aria-label={`Move ${field.label} up`}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === fields.length - 1}
                        onClick={() => moveField(step.value, index, 1)}
                        aria-label={`Move ${field.label} down`}
                      >
                        <ChevronDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={field.type === "person_group"}
                        onClick={() => removeField(step.value, index)}
                        aria-label={`Remove ${field.label}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <CollapsibleContent className="border-t border-border p-4">
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
                              items={FIELD_TYPES.filter(
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
                                  {FIELD_TYPES.filter(
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
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Field>
                              <FieldLabel>Show when field</FieldLabel>
                              <Select
                                items={fields.filter((candidate) => candidate.key !== field.key && candidate.type !== "person_group").map((candidate) => ({ value: candidate.key, label: candidate.label }))}
                                value={field.visibleWhen.field}
                                onValueChange={(value) =>
                                  updateField(step.value, index, {
                                    visibleWhen: { ...field.visibleWhen!, field: value ?? "" },
                                  })
                                }
                              >
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectGroup>
                                  {fields.filter((candidate) => candidate.key !== field.key && candidate.type !== "person_group").map((candidate) => (
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
                              <FieldLabel>Value</FieldLabel>
                              <Input
                                value={field.visibleWhen.value}
                                onChange={(event) => updateField(step.value, index, { visibleWhen: { ...field.visibleWhen!, value: event.target.value } })}
                              />
                            </Field>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="self-start"
                              onClick={() => updateField(step.value, index, { visibleWhen: undefined })}
                            >
                              Remove condition
                            </Button>
                          </div>
                        ) : fields.some(
                            (candidate) =>
                              candidate.key !== field.key &&
                              candidate.type !== "person_group",
                          ) && field.type !== "person_group" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="self-start"
                            onClick={() => {
                              const source = fields.find((candidate) => candidate.key !== field.key && candidate.type !== "person_group")!;
                              updateField(step.value, index, {
                                visibleWhen: { field: source.key, operator: "equals", value: "" },
                              });
                            }}
                          >
                            Add visibility condition
                          </Button>
                        ) : null}
                      </FieldGroup>
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
            {STEPS.map((step) => (
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
