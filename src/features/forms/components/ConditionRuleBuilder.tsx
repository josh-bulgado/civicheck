import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
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
  ConditionRule,
  FormCondition,
  FormOption,
} from "../form-template.types";

export interface ConditionSource {
  key: string;
  label: string;
  options?: FormOption[];
}

function initialCondition(source: ConditionSource): FormCondition {
  return {
    field: source.key,
    operator: "equals",
    value: source.options?.[0]?.value ?? "",
  };
}

export function ConditionRuleBuilder({
  idPrefix,
  rule,
  sources,
  onChange,
  emptyLabel = "Always applies",
}: {
  idPrefix: string;
  rule: ConditionRule | null;
  sources: ConditionSource[];
  onChange: (rule: ConditionRule | null) => void;
  emptyLabel?: string;
}) {
  function updateCondition(index: number, patch: Partial<FormCondition>) {
    if (!rule) return;
    const conditions = [...rule.conditions];
    conditions[index] = { ...conditions[index], ...patch };
    onChange({ ...rule, conditions });
  }

  if (!rule) {
    return (
      <Field>
        <FieldDescription>{emptyLabel}</FieldDescription>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={sources.length === 0}
          onClick={() =>
            onChange({
              match: "all",
              conditions: [initialCondition(sources[0])],
            })
          }
        >
          <Plus aria-hidden="true" data-icon="inline-start" />
          Add condition
        </Button>
      </Field>
    );
  }

  return (
    <FieldGroup className="gap-3 rounded-lg border border-border bg-background p-3">
      {rule.conditions.length > 1 ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-match`}>Match</FieldLabel>
          <Select
            value={rule.match}
            onValueChange={(value) =>
              onChange({ ...rule, match: value === "any" ? "any" : "all" })
            }
          >
            <SelectTrigger id={`${idPrefix}-match`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All conditions</SelectItem>
                <SelectItem value="any">Any condition</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {rule.conditions.map((condition, index) => {
        const source = sources.find((candidate) => candidate.key === condition.field);
        return (
          <div
            key={`${condition.field}-${index}`}
            className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)_auto]"
          >
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-${index}-field`}>
                Answer
              </FieldLabel>
              <Select
                value={condition.field}
                onValueChange={(value) => {
                  const nextSource = sources.find(
                    (candidate) => candidate.key === value,
                  );
                  if (!nextSource) return;
                  updateCondition(index, initialCondition(nextSource));
                }}
              >
                <SelectTrigger
                  id={`${idPrefix}-${index}-field`}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sources.map((candidate) => (
                      <SelectItem key={candidate.key} value={candidate.key}>
                        {candidate.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor={`${idPrefix}-${index}-operator`}>
                Comparison
              </FieldLabel>
              <Select
                value={condition.operator}
                onValueChange={(value) =>
                  updateCondition(index, {
                    operator: value === "not_equals" ? "not_equals" : "equals",
                  })
                }
              >
                <SelectTrigger
                  id={`${idPrefix}-${index}-operator`}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Does not equal</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor={`${idPrefix}-${index}-value`}>
                Value
              </FieldLabel>
              {source?.options?.length ? (
                <Select
                  value={condition.value}
                  onValueChange={(value) =>
                    updateCondition(index, { value: value ?? "" })
                  }
                >
                  <SelectTrigger
                    id={`${idPrefix}-${index}-value`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {source.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`${idPrefix}-${index}-value`}
                  value={condition.value}
                  onChange={(event) =>
                    updateCondition(index, { value: event.target.value })
                  }
                  autoComplete="off"
                />
              )}
            </Field>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const conditions = rule.conditions.filter(
                  (_, conditionIndex) => conditionIndex !== index,
                );
                onChange(
                  conditions.length > 0 ? { ...rule, conditions } : null,
                );
              }}
              aria-label={`Remove condition ${index + 1}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={sources.length === 0 || rule.conditions.length >= 20}
        onClick={() =>
          onChange({
            ...rule,
            conditions: [...rule.conditions, initialCondition(sources[0])],
          })
        }
      >
        <Plus aria-hidden="true" data-icon="inline-start" />
        Add condition
      </Button>
    </FieldGroup>
  );
}
