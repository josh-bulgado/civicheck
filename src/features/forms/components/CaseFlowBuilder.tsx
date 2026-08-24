import { Link } from "@tanstack/react-router";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
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
import { cn } from "~/lib/utils";
import type {
  CaseSelectorDefinition,
  CaseSelectorQuestion,
  ConditionRule,
} from "../form-template.types";
import {
  ConditionRuleBuilder,
  type ConditionSource,
} from "./ConditionRuleBuilder";

interface VariantOption {
  service_code: string;
  name: string;
  fee: number;
}

function nextQuestionKey(definition: CaseSelectorDefinition) {
  const used = new Set(definition.questions.map((question) => question.key));
  let index = 1;
  while (used.has(`case_question_${index}`)) index += 1;
  return `case_question_${index}`;
}

function sourcesForQuestions(
  questions: CaseSelectorQuestion[],
): ConditionSource[] {
  return questions.map((question) => ({
    key: question.key,
    label: question.label,
    options: question.options,
  }));
}

export function CaseFlowBuilder({
  definition,
  variants,
  derivedSources = [],
  immutableQuestionKeys = [],
  onChange,
}: {
  definition?: CaseSelectorDefinition;
  variants: VariantOption[];
  derivedSources?: ConditionSource[];
  immutableQuestionKeys?: string[];
  onChange: (definition: CaseSelectorDefinition | undefined) => void;
}) {
  if (!definition) {
    return (
      <FieldGroup className="gap-3 rounded-lg border border-dashed border-border p-4">
        <Field>
          <FieldLabel>Variant Routing</FieldLabel>
          <FieldDescription>
            {variants.length > 1
              ? `This dossier has ${variants.length} internal variants. Add database-backed questions that resolve an applicant to the correct one.`
              : "This is a standalone service. Add conditional application fields below instead of creating a routing flow."}
          </FieldDescription>
        </Field>
        {variants.length > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              onChange({
                title: "Find the right service",
                description:
                  "Choose the answers that match this case. We’ll select the correct service.",
                questions: [
                  {
                    key: "case_question_1",
                    label: "Case question",
                    options: [
                      { value: "option_1", label: "Option 1" },
                      { value: "option_2", label: "Option 2" },
                    ],
                  },
                ],
                outcomes: [],
              })
            }
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Configure variant routing
          </Button>
        ) : null}
      </FieldGroup>
    );
  }
  const caseFlow = definition;

  function updateQuestion(
    index: number,
    patch: Partial<CaseSelectorQuestion>,
  ) {
    const questions = [...caseFlow.questions];
    const previousKey = questions[index].key;
    questions[index] = { ...questions[index], ...patch };
    const nextKey = questions[index].key;
    if (previousKey === nextKey) {
      onChange({ ...caseFlow, questions });
      return;
    }

    onChange({
      ...caseFlow,
      questions: questions.map((question) => ({
        ...question,
        visibleWhen: question.visibleWhen
          ? {
              ...question.visibleWhen,
              conditions: question.visibleWhen.conditions.map((condition) =>
                condition.field === previousKey
                  ? { ...condition, field: nextKey }
                  : condition,
              ),
            }
          : undefined,
      })),
      outcomes: caseFlow.outcomes.map((outcome) => ({
        ...outcome,
        when: {
          ...outcome.when,
          conditions: outcome.when.conditions.map((condition) =>
            condition.field === previousKey
              ? { ...condition, field: nextKey }
              : condition,
          ),
        },
      })),
    });
  }

  function updateQuestionOptionValue(
    questionIndex: number,
    optionIndex: number,
    value: string,
  ) {
    const question = caseFlow.questions[questionIndex];
    const previousValue = question.options[optionIndex].value;
    const options = [...question.options];
    options[optionIndex] = { ...options[optionIndex], value };

    onChange({
      ...caseFlow,
      questions: caseFlow.questions.map((candidate, index) => ({
        ...candidate,
        ...(index === questionIndex ? { options } : {}),
        visibleWhen: candidate.visibleWhen
          ? {
              ...candidate.visibleWhen,
              conditions: candidate.visibleWhen.conditions.map((condition) =>
                condition.field === question.key &&
                condition.value === previousValue
                  ? { ...condition, value }
                  : condition,
              ),
            }
          : undefined,
      })),
      outcomes: caseFlow.outcomes.map((outcome) => ({
        ...outcome,
        when: {
          ...outcome.when,
          conditions: outcome.when.conditions.map((condition) =>
            condition.field === question.key &&
            condition.value === previousValue
              ? { ...condition, value }
              : condition,
          ),
        },
      })),
    });
  }

  function removeQuestionOption(questionIndex: number, optionIndex: number) {
    const question = caseFlow.questions[questionIndex];
    const removedValue = question.options[optionIndex].value;
    const options = question.options.filter((_, index) => index !== optionIndex);

    const questions = caseFlow.questions.map((candidate, index) => {
      const conditions = candidate.visibleWhen?.conditions.filter(
        (condition) =>
          !(
            condition.field === question.key &&
            condition.value === removedValue
          ),
      );
      return {
        ...candidate,
        ...(index === questionIndex ? { options } : {}),
        visibleWhen:
          candidate.visibleWhen && conditions?.length
            ? { ...candidate.visibleWhen, conditions }
            : undefined,
      };
    });
    const outcomes = caseFlow.outcomes.flatMap((outcome) => {
      const conditions = outcome.when.conditions.filter(
        (condition) =>
          !(
            condition.field === question.key &&
            condition.value === removedValue
          ),
      );
      return conditions.length
        ? [{ ...outcome, when: { ...outcome.when, conditions } }]
        : [];
    });
    onChange({ ...caseFlow, questions, outcomes });
  }

  function removeQuestion(index: number) {
    const removedKey = caseFlow.questions[index].key;
    const questions = caseFlow.questions.filter(
      (_, questionIndex) => questionIndex !== index,
    );
    const outcomes = caseFlow.outcomes.flatMap((outcome) => {
      const conditions = outcome.when.conditions.filter(
        (condition) => condition.field !== removedKey,
      );
      return conditions.length > 0
        ? [{ ...outcome, when: { ...outcome.when, conditions } }]
        : [];
    });
    onChange({
      ...caseFlow,
      questions: questions.map((question) => {
        const conditions = question.visibleWhen?.conditions.filter(
          (condition) => condition.field !== removedKey,
        );
        return {
          ...question,
          visibleWhen:
            question.visibleWhen && conditions?.length
              ? { ...question.visibleWhen, conditions }
              : undefined,
        };
      }),
      outcomes,
    });
  }

  function updateOutcome(serviceCode: string, rule: ConditionRule | null) {
    const remaining = caseFlow.outcomes.filter(
      (outcome) => outcome.serviceCode !== serviceCode,
    );
    onChange({
      ...caseFlow,
      outcomes: rule
        ? [...remaining, { serviceCode, when: rule }]
        : remaining,
    });
  }

  const allSources = [
    ...derivedSources,
    ...sourcesForQuestions(caseFlow.questions),
  ];

  return (
    <FieldGroup className="gap-5 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="case-flow-title">Selector Title</FieldLabel>
          <Input
            id="case-flow-title"
            value={caseFlow.title}
            onChange={(event) =>
              onChange({ ...caseFlow, title: event.target.value })
            }
            autoComplete="off"
          />
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(undefined)}
        >
          <Trash2 aria-hidden="true" data-icon="inline-start" />
          Remove routing flow
        </Button>
      </div>

      <Field>
        <FieldLabel htmlFor="case-flow-description">Instructions</FieldLabel>
        <Input
          id="case-flow-description"
          value={caseFlow.description ?? ""}
          onChange={(event) =>
            onChange({ ...caseFlow, description: event.target.value })
          }
          autoComplete="off"
        />
      </Field>

      <FieldGroup className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Questions</p>
            <p className="text-xs text-muted-foreground">
              Later questions can depend on answers to earlier questions.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...caseFlow,
                questions: [
                  ...caseFlow.questions,
                  {
                    key: nextQuestionKey(caseFlow),
                    label: "New case question",
                    options: [
                      { value: "option_1", label: "Option 1" },
                      { value: "option_2", label: "Option 2" },
                    ],
                  },
                ],
              })
            }
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add question
          </Button>
        </div>

        {caseFlow.questions.map((question, questionIndex) => (
          <Collapsible key={`${question.key}-${questionIndex}`}>
            <div className="rounded-lg border border-border bg-background">
              <div className="flex items-center gap-2 p-3">
                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown aria-hidden="true" />
                  <span className="truncate text-sm font-medium">
                    {question.label}
                  </span>
                  <Badge variant="secondary">
                    {question.options.length} choices
                  </Badge>
                </CollapsibleTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={caseFlow.questions.length === 1}
                  onClick={() => removeQuestion(questionIndex)}
                  aria-label={`Remove ${question.label}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>

              <CollapsibleContent className="border-t border-border p-4">
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`case-question-${questionIndex}-label`}>
                        Question
                      </FieldLabel>
                      <Input
                        id={`case-question-${questionIndex}-label`}
                        value={question.label}
                        onChange={(event) =>
                          updateQuestion(questionIndex, {
                            label: event.target.value,
                          })
                        }
                        autoComplete="off"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`case-question-${questionIndex}-key`}>
                        Stable key
                      </FieldLabel>
                      <Input
                        id={`case-question-${questionIndex}-key`}
                        value={question.key}
                        disabled={immutableQuestionKeys.includes(question.key)}
                        onChange={(event) =>
                          updateQuestion(questionIndex, {
                            key: event.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9_]/g, "_"),
                          })
                        }
                        autoComplete="off"
                      />
                      <FieldDescription>
                        {immutableQuestionKeys.includes(question.key)
                          ? "Locked because this identifier has already been published."
                          : "Used internally by saved rules; publish it before relying on it externally."}
                      </FieldDescription>
                    </Field>
                  </div>

                  <FieldGroup className="gap-2">
                    <FieldLabel>Choices</FieldLabel>
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={`${option.value}-${optionIndex}`}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"
                      >
                        <Input
                          value={option.label}
                          aria-label={`Choice ${optionIndex + 1} label`}
                          onChange={(event) => {
                            const options = [...question.options];
                            options[optionIndex] = {
                              ...option,
                              label: event.target.value,
                            };
                            updateQuestion(questionIndex, { options });
                          }}
                          autoComplete="off"
                        />
                        <Input
                          value={option.value}
                          aria-label={`Choice ${optionIndex + 1} value`}
                          onChange={(event) =>
                            updateQuestionOptionValue(
                              questionIndex,
                              optionIndex,
                              event.target.value,
                            )
                          }
                          className="font-mono text-xs"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={question.options.length <= 2}
                          onClick={() =>
                            removeQuestionOption(questionIndex, optionIndex)
                          }
                          aria-label={`Remove choice ${optionIndex + 1}`}
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
                      onClick={() => {
                        const next = question.options.length + 1;
                        updateQuestion(questionIndex, {
                          options: [
                            ...question.options,
                            {
                              value: `option_${next}`,
                              label: `Option ${next}`,
                            },
                          ],
                        });
                      }}
                    >
                      <Plus aria-hidden="true" data-icon="inline-start" />
                      Add choice
                    </Button>
                  </FieldGroup>

                  <Field>
                    <FieldLabel>Question visibility</FieldLabel>
                    <ConditionRuleBuilder
                      idPrefix={`case-question-${questionIndex}-visibility`}
                      rule={question.visibleWhen ?? null}
                      sources={sourcesForQuestions(
                        caseFlow.questions.slice(0, questionIndex),
                      ).concat(derivedSources)}
                      emptyLabel="Always shown"
                      onChange={(visibleWhen) =>
                        updateQuestion(questionIndex, {
                          visibleWhen: visibleWhen ?? undefined,
                        })
                      }
                    />
                  </Field>
                </FieldGroup>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </FieldGroup>

      <FieldGroup className="gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Variant outcomes
          </p>
          <p className="text-xs text-muted-foreground">
            Define the answer combination that selects each internal service.
          </p>
        </div>

        {variants.map((variant) => {
          const outcome = caseFlow.outcomes.find(
            (candidate) => candidate.serviceCode === variant.service_code,
          );
          return (
            <Collapsible key={variant.service_code}>
              <div className="rounded-lg border border-border bg-background">
                <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-left">
                  <ChevronDown aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {variant.name}
                  </span>
                  <Badge variant={outcome ? "default" : "secondary"}>
                    {outcome ? "Mapped" : "Not mapped"}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border p-4">
                  <FieldGroup>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <code className="text-xs text-muted-foreground">
                        {variant.service_code}
                      </code>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {Number(variant.fee) === 0
                            ? "Free"
                            : `₱${Number(variant.fee).toLocaleString()}`}
                        </span>
                        <Link
                          to="/admin/services/$serviceCode/edit"
                          params={{ serviceCode: variant.service_code }}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                          )}
                        >
                          <Pencil aria-hidden="true" data-icon="inline-start" />
                          Edit variant
                        </Link>
                      </div>
                    </div>
                    <ConditionRuleBuilder
                      idPrefix={`case-outcome-${variant.service_code}`}
                      rule={outcome?.when ?? null}
                      sources={allSources}
                      emptyLabel="No answer combination is mapped to this variant yet."
                      onChange={(rule) =>
                        updateOutcome(variant.service_code, rule)
                      }
                    />
                  </FieldGroup>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </FieldGroup>

      {caseFlow.outcomes.length !== variants.length ? (
        <Alert variant="warning">
          <AlertDescription>
            Map every internal variant before publishing this case flow.
          </AlertDescription>
        </Alert>
      ) : null}
    </FieldGroup>
  );
}
