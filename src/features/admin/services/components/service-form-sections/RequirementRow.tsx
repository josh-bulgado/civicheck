import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Check,
  ChevronDown,
  Copy,
  Lock,
  Minus,
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
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ConditionRuleBuilder,
  type ConditionSource,
} from "~/features/forms/components/ConditionRuleBuilder";
import { cn } from "~/lib/utils";
import type { RequirementScope } from "../requirement-scope";
import type { ServiceFormValues } from "../service-form.config";

export type RequirementValue = ServiceFormValues["requirements"][number];

interface RequirementRowProps {
  index: number;
  value: RequirementValue;
  scope: RequirementScope;
  conditionSources: ConditionSource[];
  partyRoles: string[];
  /** Inherited rows are read-only until the group is explicitly unlocked. */
  locked: boolean;
  canRemove: boolean;
  initiallyOpen?: boolean;
  onRemove: () => void;
  /** Only supplied when the group has routing, so an override is meaningful. */
  onOverride?: () => void;
}

function ScopeBadge({ scope }: { scope: RequirementScope }) {
  const variant =
    scope.kind === "variant"
      ? "default"
      : scope.kind === "conditional"
        ? "secondary"
        : "outline";
  return (
    <Badge variant={variant} className="shrink-0">
      {scope.label}
    </Badge>
  );
}

export function RequirementRow({
  index,
  value,
  scope,
  conditionSources,
  partyRoles,
  locked,
  canRemove,
  initiallyOpen = false,
  onRemove,
  onOverride,
}: RequirementRowProps) {
  const form = useFormContext<ServiceFormValues>();
  const [showCondition, setShowCondition] = useState(false);

  const name = value.requirement_name?.trim() || "Untitled requirement";
  const applies = scope.kind !== "other";
  const requiresUpload = value.requires_upload ?? true;
  const uploadScope = value.upload_scope ?? "request";
  const conditionLine =
    scope.conditionSummary ??
    (scope.kind === "other"
      ? "Does not apply to this variant"
      : "Applies to every applicant");

  return (
    <Collapsible defaultOpen={initiallyOpen}>
      <div className="rounded-lg border border-border bg-background">
        <div className="flex items-start gap-2 p-3">
          <CollapsibleTrigger
            disabled={locked}
            className={cn(
              "group flex min-w-0 flex-1 items-start gap-2 text-left",
              locked ? "cursor-not-allowed" : "cursor-pointer",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                applies
                  ? "bg-primary-soft text-primary"
                  : "bg-muted text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {applies ? (
                <Check className="size-3.5" />
              ) : (
                <Minus className="size-3.5" />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {name}
                </span>
                <Badge variant="secondary" className="shrink-0">
                  {value.is_mandatory ? "Required" : "Optional"}
                </Badge>
                {!requiresUpload ? (
                  <Badge variant="outline" className="shrink-0">
                    No file
                  </Badge>
                ) : null}
                <ScopeBadge scope={scope} />
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {conditionLine}
              </span>
            </span>
          </CollapsibleTrigger>

          {scope.kind === "inherited" && onOverride ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onOverride}
              title="Override for this variant"
              aria-label={`Override ${name} for this variant`}
            >
              <Copy aria-hidden="true" />
            </Button>
          ) : null}

          {!locked && canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label={`Remove ${name}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          ) : null}

          {locked ? (
            <span
              className="mt-1 text-muted-foreground"
              title="Inherited from the group checklist. Unlock the group to edit."
            >
              <Lock aria-hidden="true" className="size-4" />
            </span>
          ) : (
            <ChevronDown
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            />
          )}
        </div>

        {!locked ? (
          <CollapsibleContent className="border-t border-border p-4">
            <FieldGroup className="gap-3">
              <div className="flex items-start gap-2">
                <Controller
                  control={form.control}
                  name={`requirements.${index}.requirement_name`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="flex-1">
                      <FieldLabel htmlFor={`requirement-name-${index}`}>
                        Requirement
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`requirement-name-${index}`}
                        placeholder="Valid ID, 1 photocopy with signature…"
                        autoComplete="off"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name={`requirements.${index}.where_to_secure`}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={`requirement-source-${index}`}>
                        Where to Secure
                      </FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        id={`requirement-source-${index}`}
                        placeholder="Government / private sector…"
                        autoComplete="off"
                      />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name={`requirements.${index}.is_mandatory`}
                  render={({ field }) => (
                    <FieldSet>
                      <FieldLegend variant="label" className="mb-0">
                        Applies To
                      </FieldLegend>
                      <RadioGroup
                        name={field.name}
                        value={field.value ? "required" : "conditional"}
                        onValueChange={(next) =>
                          field.onChange(next === "required")
                        }
                        className="mt-3 grid-cols-2 gap-2"
                      >
                        <FieldLabel htmlFor={`requirement-required-${index}`}>
                          <Field orientation="horizontal" className="h-9 py-0!">
                            <RadioGroupItem
                              value="required"
                              id={`requirement-required-${index}`}
                            />
                            Required
                          </Field>
                        </FieldLabel>
                        <FieldLabel
                          htmlFor={`requirement-conditional-${index}`}
                        >
                          <Field orientation="horizontal" className="h-9 py-0!">
                            <RadioGroupItem
                              value="conditional"
                              id={`requirement-conditional-${index}`}
                            />
                            If applicable
                          </Field>
                        </FieldLabel>
                      </RadioGroup>
                    </FieldSet>
                  )}
                />
              </div>

              <div className="grid gap-3 rounded-md border border-border bg-surface-subtle p-3 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name={`requirements.${index}.requires_upload`}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel
                        htmlFor={`requirement-upload-${index}`}
                        className="cursor-pointer"
                      >
                        <Field orientation="horizontal" className="gap-3">
                          <Checkbox
                            id={`requirement-upload-${index}`}
                            name={field.name}
                            checked={field.value}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                          />
                          Applicant must upload a file
                        </Field>
                      </FieldLabel>
                      <FieldDescription>
                        Turn this off for an in-person action or reminder.
                      </FieldDescription>
                    </Field>
                  )}
                />

                {requiresUpload ? (
                  <Controller
                    control={form.control}
                    name={`requirements.${index}.upload_scope`}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel
                          htmlFor={`requirement-upload-scope-${index}`}
                        >
                          File needed from
                        </FieldLabel>
                        <Select
                          name={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id={`requirement-upload-scope-${index}`}
                            className="w-full"
                          >
                            <SelectValue>
                              {(scopeValue) =>
                                scopeValue === "each_subject"
                                  ? "Every person"
                                  : scopeValue === "specific_subject"
                                    ? "One specific person"
                                    : "Once per request"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="request">
                                Once per request
                              </SelectItem>
                              <SelectItem value="each_subject">
                                Every person
                              </SelectItem>
                              <SelectItem value="specific_subject">
                                One specific person
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          For example, CENOMAR can require one file from every
                          applicant.
                        </FieldDescription>
                      </Field>
                    )}
                  />
                ) : null}

                {requiresUpload && uploadScope === "specific_subject" ? (
                  <Controller
                    control={form.control}
                    name={`requirements.${index}.subject_role`}
                    render={({ field, fieldState }) => (
                      <Field
                        className="sm:col-start-2"
                        data-invalid={fieldState.invalid}
                      >
                        <FieldLabel
                          htmlFor={`requirement-subject-role-${index}`}
                        >
                          Person
                        </FieldLabel>
                        <Select
                          name={field.name}
                          value={field.value || null}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id={`requirement-subject-role-${index}`}
                            className="w-full"
                            aria-invalid={fieldState.invalid}
                          >
                            <SelectValue placeholder="Select a role…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {partyRoles.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {fieldState.invalid ? (
                          <FieldError errors={[fieldState.error]} />
                        ) : null}
                      </Field>
                    )}
                  />
                ) : null}
              </div>

              <Controller
                control={form.control}
                name={`requirements.${index}.applies_when`}
                render={({ field }) =>
                  field.value ? (
                    <Field>
                      <FieldLabel>When does this requirement apply?</FieldLabel>
                      <ConditionRuleBuilder
                        idPrefix={`requirement-${index}-condition`}
                        rule={field.value}
                        sources={conditionSources}
                        emptyLabel="Applies to every applicant for the selected service."
                        onChange={field.onChange}
                      />
                      {form.getValues(`requirements.${index}.case_tag`) ? (
                        <FieldDescription>
                          This row also carries a legacy case tag. The condition
                          above takes precedence.
                        </FieldDescription>
                      ) : null}
                    </Field>
                  ) : showCondition ? (
                    <ConditionRuleBuilder
                      idPrefix={`requirement-${index}-condition`}
                      rule={null}
                      sources={conditionSources}
                      emptyLabel="Applies to every applicant for the selected service."
                      onChange={(rule) => {
                        field.onChange(rule);
                        if (!rule) setShowCondition(false);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <FieldDescription>
                        Applies to every applicant for the selected service.
                      </FieldDescription>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={conditionSources.length === 0}
                        onClick={() => setShowCondition(true)}
                      >
                        Add condition
                      </Button>
                    </div>
                  )
                }
              />
            </FieldGroup>
          </CollapsibleContent>
        ) : null}
      </div>
    </Collapsible>
  );
}
