import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Copy, Plus, Route as RouteIcon, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupTextarea } from "~/components/ui/input-group";
import {
  STEP_PLACEHOLDERS,
  type ServiceFormValues,
} from "../service-form.config";

export function CitizenJourneySection({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const form = useFormContext<ServiceFormValues>();
  const stepFields = useFieldArray({
    control: form.control,
    name: "steps",
  });
  const partyRoleFields = useFieldArray({
    control: form.control,
    name: "party_roles",
  });

  return (
    <Card
      id={embedded ? undefined : "citizen-journey"}
      variant={embedded ? "embedded" : "default"}
      className={embedded ? undefined : "scroll-mt-6"}
    >
      {!embedded ? (
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <RouteIcon aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle>
                <h2>Citizen Journey</h2>
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      ) : null}
      <CardContent className="flex flex-col gap-7">
        <section
          className="flex flex-col gap-3"
          aria-labelledby="client-steps-heading"
        >
          <div>
            <h3
              id="client-steps-heading"
              className="text-sm font-medium text-foreground"
            >
              Client Steps
            </h3>
            <p className="text-xs text-muted-foreground">
              Follow the charter&rsquo;s SUBMIT / PAY / CLAIM sequence.
            </p>
          </div>

          <ol className="flex flex-col gap-3">
            {stepFields.fields.map((stepField, index) => (
              <li
                key={stepField.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label
                    htmlFor={`service-step-${index}`}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Step {index + 1}
                  </label>
                  <Controller
                    control={form.control}
                    name={`steps.${index}.value`}
                    render={({ field }) => (
                      <InputGroup>
                        <InputGroupTextarea
                          {...field}
                          id={`service-step-${index}`}
                          rows={2}
                          autoComplete="off"
                          placeholder={`${
                            STEP_PLACEHOLDERS[index] ??
                            "Describe this step for the applicant"
                          }…`}
                        />
                      </InputGroup>
                    )}
                  />
                </div>
                <div className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    onClick={() =>
                      stepFields.insert(index + 1, {
                        value: form.getValues(`steps.${index}.value`),
                      })
                    }
                    aria-label={`Duplicate step ${index + 1}`}
                  >
                    <Copy aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => stepFields.remove(index)}
                    aria-label={`Remove step ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-dashed"
            onClick={() => stepFields.append({ value: "" })}
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add Step
          </Button>
        </section>

        <section
          className="flex flex-col gap-3 border-t border-border pt-6"
          aria-labelledby="person-roles-heading"
        >
          <div>
            <h3
              id="person-roles-heading"
              className="text-sm font-medium text-foreground"
            >
              Person Roles
            </h3>
            <p className="text-xs text-muted-foreground">
              Who the application is about. Most services need one; Marriage License needs two.
            </p>
          </div>

          <ul className="grid gap-3 ">
            {partyRoleFields.fields.map((roleField, index) => (
              <li
                key={roleField.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <Controller
                  control={form.control}
                  name={`party_roles.${index}.value`}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Subject…"
                      aria-label={`Person role ${index + 1}`}
                      autoComplete="off"
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={partyRoleFields.fields.length <= 1}
                  onClick={() => partyRoleFields.remove(index)}
                  aria-label={`Remove person role ${index + 1}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-dashed"
            onClick={() => partyRoleFields.append({ value: "" })}
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add Person Role
          </Button>
        </section>

        <section
          className="flex flex-col gap-3 border-t border-border pt-6"
          aria-labelledby="request-messages-heading"
        >
          <div>
            <h3
              id="request-messages-heading"
              className="text-sm font-medium text-foreground"
            >
              Messages
            </h3>
          </div>

          <Controller
            control={form.control}
            name="allows_messages"
            render={({ field }) => (
              <FieldLabel
                htmlFor="service-allows-messages"
                className="cursor-pointer"
              >
                <Field
                  orientation="horizontal"
                  className="items-start gap-4 p-4 sm:p-5"
                >
                  <Checkbox
                    id="service-allows-messages"
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  <FieldContent className="gap-1.5">
                    <FieldTitle>Allow messages on requests</FieldTitle>
                    <FieldDescription>
                      Applicants and staff can exchange short messages inside a request, for question-and-answer services such as an online inquiry. Not available for walk-ins.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            )}
          />
        </section>
      </CardContent>
    </Card>
  );
}
