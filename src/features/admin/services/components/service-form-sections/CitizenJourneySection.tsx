import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Copy, Plus, Route as RouteIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { SettingGroup } from "./SettingGroup";
import {
  STEP_PLACEHOLDERS,
  type ServiceFormValues,
} from "../service-form.config";

/** A soft row holding a numbered item: step, role. */
const LIST_ROW =
  "flex items-start gap-3.5 rounded-2xl bg-surface-subtle p-3.5 pl-4 ring-1 ring-border ring-inset";
/** A step: badge and label on the first line, the textarea under it. */
const STEP_ROW =
  "grid grid-cols-[30px_minmax(0,1fr)_auto] gap-x-3.5 gap-y-2 rounded-2xl bg-surface-subtle p-3.5 pl-4 ring-1 ring-border ring-inset";
const NUMBER_BADGE =
  "flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary";
const ADD_ROW =
  "w-full rounded-[14px] border-[1.5px] border-dashed border-foreground/20 bg-transparent text-body shadow-none hover:border-primary hover:bg-primary/5 hover:text-primary";

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

  function removeStep(index: number) {
    const removed = form.getValues("steps")[index];
    if (!removed) return;
    stepFields.remove(index);
    toast(`Removed step ${index + 1}`, {
      action: {
        label: "Undo",
        onClick: () => {
          const count = form.getValues("steps").length;
          stepFields.insert(Math.min(index, count), removed);
        },
      },
    });
  }

  return (
    <Card
      id={embedded ? undefined : "citizen-journey"}
      variant={embedded ? "embedded" : "default"}
      // Embedded, -mt-6 cancels the section card's top padding so the first band
      // meets the header. It sits on this card because the card clips overflow.
      className={embedded ? "-mt-6" : "scroll-mt-6"}
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
      <CardContent className="flex flex-col">
        <SettingGroup
          title="Client Steps"
          headingId="client-steps-heading"
          aside="Follow the charter’s SUBMIT / PAY / CLAIM sequence."
          padded
        >
          <ol className="flex flex-col gap-2.5">
            {stepFields.fields.map((stepField, index) => (
              <li key={stepField.id} className={STEP_ROW}>
                <span className={cn(NUMBER_BADGE, "col-start-1 row-start-1 self-center")}>
                  {index + 1}
                </span>
                <label
                  htmlFor={`service-step-${index}`}
                  className="col-start-2 row-start-1 self-center text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase"
                >
                  Step {index + 1}
                </label>
                <Controller
                  control={form.control}
                  name={`steps.${index}.value`}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id={`service-step-${index}`}
                      rows={2}
                      autoComplete="off"
                      fieldSize="touch"
                      className="col-span-3 row-start-2 bg-card sm:col-span-1 sm:col-start-2"
                      placeholder={`${
                        STEP_PLACEHOLDERS[index] ??
                        "Describe this step for the applicant"
                      }…`}
                    />
                  )}
                />
                {/* Beside the label on a phone so the textarea keeps the full width. */}
                <div className="col-start-3 row-start-1 flex items-center self-center sm:row-span-2 sm:self-start">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
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
                    size="icon-lg"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeStep(index)}
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
            size="touch"
            className={ADD_ROW}
            onClick={() => stepFields.append({ value: "" })}
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add Step
          </Button>
        </SettingGroup>

        <SettingGroup
          title="Person Roles"
          headingId="person-roles-heading"
          aside="Who the application is about. Most services need one; Marriage License needs two."
          padded
        >
          <ul className="flex flex-col gap-2.5">
            {partyRoleFields.fields.map((roleField, index) => (
              <li key={roleField.id} className={cn(LIST_ROW, "items-center")}>
                <span className={NUMBER_BADGE}>{index + 1}</span>
                <Controller
                  control={form.control}
                  name={`party_roles.${index}.value`}
                  render={({ field }) => (
                    <Input
                      {...field}
                      fieldSize="touch"
                      className="bg-card"
                      placeholder="Subject…"
                      aria-label={`Person role ${index + 1}`}
                      autoComplete="off"
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
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
            size="touch"
            className={ADD_ROW}
            onClick={() => partyRoleFields.append({ value: "" })}
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add Person Role
          </Button>
        </SettingGroup>

        <SettingGroup title="Messages" headingId="request-messages-heading">
          <Controller
            control={form.control}
            name="allows_messages"
            render={({ field }) => (
              <Field
                orientation="horizontal"
                className="gap-6 px-6 py-5 has-[>[data-slot=field-content]]:items-start sm:px-8 sm:has-[>[data-slot=field-content]]:items-center"
              >
                <FieldContent className="min-w-0 max-w-[66ch]">
                  <FieldLabel htmlFor="service-allows-messages">
                    Allow messages on requests
                  </FieldLabel>
                  <FieldDescription id="service-allows-messages-help">
                    Applicants and staff can exchange short messages inside a request, for question-and-answer services such as an online inquiry. Not available for walk-ins.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="service-allows-messages"
                  name={field.name}
                  size="touch"
                  className="ml-auto shrink-0"
                  aria-describedby="service-allows-messages-help"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              </Field>
            )}
          />
        </SettingGroup>
      </CardContent>
    </Card>
  );
}
