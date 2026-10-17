import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { FieldDescription } from "~/components/ui/field";
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

/**
 * The pills are narrower than some of their options, and a select's popup
 * defaults to the trigger's width and clips the rest. Let it grow to the widest
 * option instead, up to a cap, and never below the trigger.
 */
const POPUP_CLASS =
  "w-auto min-w-(--anchor-width) max-w-[min(28rem,var(--available-width))]";

function initialCondition(source: ConditionSource): FormCondition {
  return {
    field: source.key,
    operator: "equals",
    value: source.options?.[0]?.value ?? "",
  };
}

/**
 * Edits a rule as a sentence: "When [question] is [answer] and [question] is
 * not [answer]". A rule has one connective for the whole sentence, so the
 * and/or chip flips every row at once rather than pretending each row is
 * independent.
 */
export function ConditionRuleBuilder({
  idPrefix,
  rule,
  sources,
  onChange,
  emptyLabel = "Always applies",
  lead = "When",
  single = false,
}: {
  idPrefix: string;
  rule: ConditionRule | null;
  sources: ConditionSource[];
  onChange: (rule: ConditionRule | null) => void;
  emptyLabel?: string;
  /** The word that opens the sentence, e.g. "Show when". */
  lead?: string;
  /** One condition only: no Add Condition button and no AND/OR chip. */
  single?: boolean;
}) {
  function updateCondition(index: number, patch: Partial<FormCondition>) {
    if (!rule) return;
    const conditions = [...rule.conditions];
    conditions[index] = { ...conditions[index], ...patch };
    onChange({ ...rule, conditions });
  }

  if (!rule) {
    return (
      <div className="flex flex-col items-start gap-2">
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
          Add Condition
        </Button>
      </div>
    );
  }

  const matchAll = rule.match === "all";

  return (
    <div
      role="group"
      aria-label="Conditions"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-subtle p-3"
    >
      {rule.conditions.map((condition, index) => {
        const source = sources.find(
          (candidate) => candidate.key === condition.field,
        );
        const position = index + 1;

        return (
          // Rows are positional: keying by the chosen question would remount
          // the row, and drop focus, every time that question changes.
          <div key={index} className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {index === 0 ? (
                <span className="min-w-16 text-sm text-muted-foreground">
                  {lead}
                </span>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-w-16 font-semibold tracking-wide"
                  title="Switch between AND and OR for the whole rule"
                  aria-label={
                    matchAll
                      ? "All conditions must match. Switch to any."
                      : "Any condition can match. Switch to all."
                  }
                  onClick={() =>
                    onChange({ ...rule, match: matchAll ? "any" : "all" })
                  }
                >
                  {matchAll ? "AND" : "OR"}
                </Button>
              )}

              <Select
                items={sources.map((candidate) => ({
                  value: candidate.key,
                  label: candidate.label,
                }))}
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
                  className="w-auto max-w-full min-w-40 rounded-full border-primary/30 bg-primary-soft font-medium text-primary"
                  aria-label={`Condition ${position}: question`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={POPUP_CLASS}>
                  <SelectGroup>
                    {sources.map((candidate) => (
                      <SelectItem key={candidate.key} value={candidate.key}>
                        {candidate.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

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
                  className="w-auto rounded-full border-primary/30 bg-primary-soft font-medium text-primary"
                  aria-label={`Condition ${position}: comparison`}
                >
                  <SelectValue>
                    {(operator) => (operator === "not_equals" ? "is not" : "is")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className={POPUP_CLASS}>
                  <SelectGroup>
                    <SelectItem value="equals">is</SelectItem>
                    <SelectItem value="not_equals">is not</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {source?.options?.length ? (
                <Select
                  items={source.options}
                  value={condition.value}
                  onValueChange={(value) =>
                    updateCondition(index, { value: value ?? "" })
                  }
                >
                  <SelectTrigger
                    id={`${idPrefix}-${index}-value`}
                    className="w-auto max-w-full min-w-40 rounded-full border-primary/30 bg-primary-soft font-medium text-primary"
                    aria-label={`Condition ${position}: answer`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={POPUP_CLASS}>
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
                  aria-label={`Condition ${position}: answer`}
                  className="w-48 rounded-full"
                />
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => {
                const conditions = rule.conditions.filter(
                  (_, conditionIndex) => conditionIndex !== index,
                );
                onChange(
                  conditions.length > 0 ? { ...rule, conditions } : null,
                );
              }}
              aria-label={`Remove condition ${position}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        );
      })}

      {!single && rule.conditions.length > 1 ? (
        <p className="text-xs text-muted-foreground">
          {matchAll
            ? "Every condition above must match."
            : "Any one of the conditions above is enough."}
        </p>
      ) : null}

      {single ? null : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start rounded-full border-dashed border-primary/40 text-primary"
          disabled={sources.length === 0 || rule.conditions.length >= 20}
          onClick={() =>
            onChange({
              ...rule,
              conditions: [...rule.conditions, initialCondition(sources[0])],
            })
          }
        >
          <Plus aria-hidden="true" data-icon="inline-start" />
          Add Condition
        </Button>
      )}
    </div>
  );
}
