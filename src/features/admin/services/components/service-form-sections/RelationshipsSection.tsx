import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Settings2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { ServiceFormValues } from "../service-form.config";

const SHORT_NAME_MAX = 40;

export function RelationshipsSection({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const form = useFormContext<ServiceFormValues>();
  const [displayGroup, requirementGroup] = useWatch({
    control: form.control,
    name: ["display_group", "requirement_group"],
  });
  // Same rule as `relationshipsSummary` in ServiceFormPage, so the tab count
  // and this chip always agree.
  const linkCount = [displayGroup, requirementGroup].filter((value) =>
    value?.trim(),
  ).length;

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
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge variant={linkCount > 0 ? "default" : "neutral"}>
            {linkCount > 0
              ? `${linkCount} ${linkCount === 1 ? "link" : "links"}`
              : "Standalone"}
          </Badge>
          <p className="min-w-0 flex-1 basis-64 text-xs text-muted-foreground">
            Only for services shown to applicants as one card with several variants. Leave blank for a standalone service.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
                  placeholder="birth_ontime…"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
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
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="service-short-name">
                    Short Name
                  </FieldLabel>
                  <span
                    id="service-short-name-count"
                    className="text-xs tabular-nums text-muted-foreground"
                  >
                    {(field.value ?? "").length} / {SHORT_NAME_MAX}
                  </span>
                </div>
                <Input
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
                  placeholder="birth_ontime…"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
                <FieldDescription>
                  Services with the same group share one checklist.
                </FieldDescription>
              </Field>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
