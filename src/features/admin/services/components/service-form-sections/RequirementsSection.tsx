import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { AlertTriangle, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
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
import { Spinner } from "~/components/ui/spinner";
import {
  ConditionRuleBuilder,
  type ConditionSource,
} from "~/features/forms/components/ConditionRuleBuilder";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import type { Service } from "../../services.types";
import {
  EMPTY_REQUIREMENT,
  type ServiceFormValues,
} from "../service-form.config";

interface RequirementsSectionProps {
  isLoading: boolean;
  sharedWith: Service[];
  formDefinition: FormTemplateDefinition;
}

export function RequirementsSection({
  isLoading,
  sharedWith,
  formDefinition,
}: RequirementsSectionProps) {
  const form = useFormContext<ServiceFormValues>();
  const requirementFields = useFieldArray({
    control: form.control,
    name: "requirements",
  });
  const requirementValues = form.watch("requirements");
  const partyRoles = form
    .watch("party_roles")
    .map((entry) => entry.value.trim())
    .filter(Boolean);
  const conditionSources: ConditionSource[] = [
    ...(formDefinition.caseSelector?.questions ?? []).map((question) => ({
      key: question.key,
      label: question.label,
      options: question.options,
    })),
    ...(formDefinition.derivedAnswers ?? []).map((derived) => ({
      key: derived.key,
      label: derived.label,
      options: derived.bands.map((band) => ({
        value: band.value,
        label: band.label,
      })),
    })),
    ...formDefinition.sections.flatMap((section) =>
      section.fields.flatMap((field) =>
        field.type === "select"
          ? [{ key: field.key, label: field.label, options: field.options }]
          : [],
      ),
    ),
  ];

  return (
    <Card id="requirements" className="scroll-mt-6">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <ClipboardCheck aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>
              <h2>Requirements</h2>
            </CardTitle>
            <CardDescription>
              What applicants must bring, where to secure it, and when each
              item applies.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sharedWith.length > 0 ? (
          <Alert variant="warning">
            <AlertTriangle aria-hidden="true" />
            <AlertDescription className="flex flex-col gap-1">
              <p className="font-semibold">
                This checklist is shared by {sharedWith.length + 1} services.
              </p>
              <p>
                Saving changes it for all of them:{" "}
                {sharedWith.map((entry) => entry.name).join(", ")}. Use the case
                tag on a row to limit it to one variant, or give this service
                its own requirement group below.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Spinner className="size-4" />
            Loading checklist&hellip;
          </div>
        ) : (
          <>
            {requirementFields.fields.map((requirementField, index) => {
              const requiresUpload =
                requirementValues[index]?.requires_upload ?? true;
              const uploadScope =
                requirementValues[index]?.upload_scope ?? "request";

              return (
              <FieldGroup
                key={requirementField.id}
                className="gap-3 rounded-lg border border-border bg-surface-subtle p-3"
              >
                <div className="flex items-start gap-2">
                  <Controller
                    control={form.control}
                    name={`requirements.${index}.requirement_name`}
                    render={({ field, fieldState }) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        className="flex-1"
                      >
                        <FieldLabel htmlFor={`requirement-name-${index}`}>
                          Requirement {index + 1}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => requirementFields.remove(index)}
                    aria-label={`Remove requirement ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
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
                          onValueChange={(value) =>
                            field.onChange(value === "required")
                          }
                          className="mt-3 grid-cols-2 gap-2"
                        >
                          <FieldLabel
                            htmlFor={`requirement-required-${index}`}
                          >
                            <Field
                              orientation="horizontal"
                              className="h-9 py-0!"
                            >
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
                            <Field
                              orientation="horizontal"
                              className="h-9 py-0!"
                            >
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

                <div className="grid gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-2">
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
                          <FieldLabel htmlFor={`requirement-upload-scope-${index}`}>
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
                                {(value) =>
                                  value === "each_subject"
                                    ? "Every person"
                                    : value === "specific_subject"
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
                          <FieldLabel htmlFor={`requirement-subject-role-${index}`}>
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
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>When does this requirement apply?</FieldLabel>
                      <ConditionRuleBuilder
                        idPrefix={`requirement-${index}-condition`}
                        rule={field.value}
                        sources={conditionSources}
                        emptyLabel="Applies to every applicant for the selected service."
                        onChange={field.onChange}
                      />
                      {form.getValues(`requirements.${index}.case_tag`) &&
                      !field.value ? (
                        <FieldDescription>
                          This row still has a legacy case tag. Add a condition
                          to replace its hardcoded behavior.
                        </FieldDescription>
                      ) : null}
                    </Field>
                  )}
                />
              </FieldGroup>
              );
            })}

            {requirementFields.fields.length === 0 ? (
              <Empty className="border border-border px-4 py-8">
                <EmptyHeader>
                  <EmptyTitle className="text-sm">
                    <h3>No Requirements Yet</h3>
                  </EmptyTitle>
                  <EmptyDescription>
                    Add the first item applicants must bring for this service.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => requirementFields.append({ ...EMPTY_REQUIREMENT })}
            >
              <Plus aria-hidden="true" data-icon="inline-start" />
              Add Requirement
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
