import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Route as RouteIcon, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupTextarea } from "~/components/ui/input-group";
import {
  STEP_PLACEHOLDERS,
  type ServiceFormValues,
} from "../service-form.config";

export function CitizenJourneySection() {
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
    <Card id="citizen-journey" className="scroll-mt-6">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <RouteIcon aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>
              <h2>Citizen Journey</h2>
            </CardTitle>
            <CardDescription>
              Describe what the applicant does and whose records the service
              needs.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
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
              What the applicant does at each stage — the charter&rsquo;s
              SUBMIT / PAY / CLAIM sequence.
            </p>
          </div>

          {stepFields.fields.map((stepField, index) => (
            <Field
              key={stepField.id}
              orientation="horizontal"
              className="items-start"
            >
              <span className="mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {index + 1}
              </span>
              <Controller
                control={form.control}
                name={`steps.${index}.value`}
                render={({ field }) => (
                  <InputGroup className="flex-1">
                    <InputGroupTextarea
                      {...field}
                      rows={2}
                      aria-label={`Client step ${index + 1}`}
                      autoComplete="off"
                      placeholder={`${
                        STEP_PLACEHOLDERS[index] ??
                        "Describe this step for the applicant"
                      }…`}
                    />
                  </InputGroup>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => stepFields.remove(index)}
                aria-label={`Remove step ${index + 1}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </Field>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
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
              Who this service&rsquo;s intake form asks about. Most services
              need just one — the record&rsquo;s subject. Marriage License needs
              two: Bride and Groom.
            </p>
          </div>

          {partyRoleFields.fields.map((roleField, index) => (
            <Field key={roleField.id} orientation="horizontal">
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
            </Field>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => partyRoleFields.append({ value: "" })}
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add Person Role
          </Button>
        </section>
      </CardContent>
    </Card>
  );
}
