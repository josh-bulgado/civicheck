import { Controller, useFormContext } from "react-hook-form";
import { ArrowDown, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { buttonVariants } from "~/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
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
  DATE_DIRECTIONS,
  type ServiceFormValues,
} from "../service-form.config";
import { CaseFlowBuilder } from "~/features/forms/components/CaseFlowBuilder";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import type { Service } from "../../services.types";

export function CaseQuestionsSection({
  variants,
  formDefinition,
  publishedFieldKeys,
  onFormDefinitionChange,
}: {
  variants: Service[];
  formDefinition: FormTemplateDefinition;
  publishedFieldKeys: string[];
  onFormDefinitionChange: (definition: FormTemplateDefinition) => void;
}) {
  const form = useFormContext<ServiceFormValues>();

  return (
    <Card id="case-questions" className="scroll-mt-6">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Users aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>
              <h2>Case Questions</h2>
            </CardTitle>
            <CardDescription>
              Keep protected workflow behavior aligned with the type of
              civil-registry case.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="event_date_label"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="service-event-date-label">
                    Date Label
                  </FieldLabel>
                  <Input
                    {...field}
                    id="service-event-date-label"
                    placeholder="Date of event…"
                    autoComplete="off"
                  />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="event_place_label"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="service-event-place-label">
                    Place Label
                  </FieldLabel>
                  <Input
                    {...field}
                    id="service-event-place-label"
                    placeholder="Place of event…"
                    autoComplete="off"
                  />
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="event_date_direction"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="service-event-date-direction">
                  Date direction
                </FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="service-event-date-direction"
                    className="w-full"
                  >
                    <SelectValue>
                      {(value) =>
                        DATE_DIRECTIONS.find(
                          (direction) => direction.value === value,
                        )?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DATE_DIRECTIONS.map((direction) => (
                        <SelectItem
                          key={direction.value}
                          value={direction.value}
                        >
                          {direction.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Most services register something that already happened. Use
                  &ldquo;Future dates only&rdquo; for a prospective service like
                  Marriage License.
                </FieldDescription>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="reference_number_label"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="service-reference-number-label">
                  Reference Number Label{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  {...field}
                  id="service-reference-number-label"
                  placeholder="Registry/OCT number (if known)…"
                  autoComplete="off"
                />
                <FieldDescription>
                  Adds an optional field to the case step so staff can start
                  looking up an existing record or case before the
                  applicant&rsquo;s visit, e.g. &ldquo;Registry/OCT number (if
                  known)&rdquo;.
                </FieldDescription>
              </Field>
            )}
          />

          <FieldSet className="gap-4">
            <FieldLegend variant="label" className="mb-0">
              Optional case questions
            </FieldLegend>
            <FieldDescription>
              Enable only the questions that apply to this service.
            </FieldDescription>

            <FieldGroup data-slot="checkbox-group" className="gap-3">
              <Controller
                control={form.control}
                name="asks_purpose"
                render={({ field }) => (
                  <FieldLabel
                    htmlFor="service-asks-purpose"
                    className="cursor-pointer"
                  >
                    <Field
                      orientation="horizontal"
                      className="items-start gap-4 p-4 sm:p-5"
                    >
                      <Checkbox
                        id="service-asks-purpose"
                        name={field.name}
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                      <FieldContent className="gap-1.5">
                        <FieldTitle>
                          Ask &ldquo;Purpose of Request&rdquo;
                        </FieldTitle>
                        <FieldDescription>
                          Use this when the applicant is requesting a copy of an
                          existing record, such as a CTC. Leave it off for
                          registration, licensing, and correction services.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                )}
              />

              <Controller
                control={form.control}
                name="asks_birth_details"
                render={({ field }) => (
                  <FieldLabel
                    htmlFor="service-asks-birth-details"
                    className="cursor-pointer"
                  >
                    <Field
                      orientation="horizontal"
                      className="items-start gap-4 p-4 sm:p-5"
                    >
                      <Checkbox
                        id="service-asks-birth-details"
                        name={field.name}
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                      <FieldContent className="gap-1.5">
                        <FieldTitle>Ask birth-specific details</FieldTitle>
                        <FieldDescription>
                          Collect the informant and birth location details.
                          Enable this only for birth registration services.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet className="gap-4 rounded-lg border border-border p-4">
            <FieldLegend variant="label" className="mb-0">
              Dynamic applicant questions
            </FieldLegend>
            <FieldDescription>
              Add dropdown questions in the Application Form, then make later
              questions or requirements appear only for selected answers. This
              works for every service, including a single Marriage License.
            </FieldDescription>
            <a
              href="#application-form"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowDown aria-hidden="true" data-icon="inline-start" />
              Edit dynamic questions
            </a>
          </FieldSet>

          {variants.length > 1 ? (
            <FieldSet className="gap-4">
              <FieldLegend variant="label" className="mb-0">
                Internal variant routing
              </FieldLegend>
              <FieldDescription>
                This extra mapping is only for dossiers with multiple internal
                service codes. Applicants still see one service while their
                answers select the correct fee, roles, process, and checklist.
              </FieldDescription>
              <CaseFlowBuilder
                definition={formDefinition.caseSelector}
                variants={variants}
                derivedSources={(formDefinition.derivedAnswers ?? []).map(
                  (derived) => ({
                    key: derived.key,
                    label: derived.label,
                    options: derived.bands.map((band) => ({
                      value: band.value,
                      label: band.label,
                    })),
                  }),
                )}
                immutableQuestionKeys={publishedFieldKeys}
                onChange={(caseSelector) =>
                  onFormDefinitionChange({
                    ...formDefinition,
                    caseSelector,
                  })
                }
              />
            </FieldSet>
          ) : null}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
