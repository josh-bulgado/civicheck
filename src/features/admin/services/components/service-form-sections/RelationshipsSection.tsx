import { Controller, useFormContext } from "react-hook-form";
import { Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { cn } from "~/lib/utils";
import type { ServiceFormValues } from "../service-form.config";

const SHORT_NAME_MAX = 40;

export function RelationshipsSection({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const form = useFormContext<ServiceFormValues>();

  return (
    <Card
      id={embedded ? undefined : "relationships"}
      variant={embedded ? "embedded" : "default"}
      className={embedded ? undefined : "scroll-mt-6"}
    >
      {!embedded ? (
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Settings2 aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle>
                <h2>Relationships</h2>
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      ) : null}
      {/* Two columns from `sm` up; the help sits under each control, where the eye already is. */}
      <CardContent className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="display_group"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="service-display-group">
                Display Group
              </FieldLabel>
              <Input
                {...field}
                id="service-display-group"
                fieldSize="touch"
                placeholder="birth_ontime…"
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="service-display-group-hint"
              />
              <FieldDescription id="service-display-group-hint">
                Services with the same group appear as one card.
              </FieldDescription>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="service-display-name">
                Display Name
              </FieldLabel>
              <Input
                {...field}
                id="service-display-name"
                fieldSize="touch"
                placeholder="Birth Certificate…"
                autoComplete="off"
              />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="short_name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="service-short-name">Short Name</FieldLabel>
              <InputGroup size="touch">
                <InputGroupInput
                  {...field}
                  id="service-short-name"
                  placeholder="Marriage License…"
                  maxLength={SHORT_NAME_MAX}
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={cn(
                    "service-short-name-count service-short-name-hint",
                    fieldState.invalid && "service-short-name-error",
                  )}
                />
                <InputGroupAddon align="inline-end">
                  <span
                    id="service-short-name-count"
                    className="text-xs tabular-nums"
                  >
                    {(field.value ?? "").length}/{SHORT_NAME_MAX}
                  </span>
                </InputGroupAddon>
              </InputGroup>
              {fieldState.invalid ? (
                <FieldError
                  id="service-short-name-error"
                  errors={[fieldState.error]}
                />
              ) : null}
              <FieldDescription id="service-short-name-hint">
                Shown on applicants' service cards. Leave empty to use the
                display name.
              </FieldDescription>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="requirement_group"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="service-requirement-group">
                Requirement Group
              </FieldLabel>
              <Input
                {...field}
                id="service-requirement-group"
                fieldSize="touch"
                placeholder="birth_ontime…"
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="service-requirement-group-hint"
              />
              <FieldDescription id="service-requirement-group-hint">
                Services with the same group share one checklist.
              </FieldDescription>
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
}
