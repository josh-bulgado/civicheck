import { useEffect, useRef } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { CircleCheck, ClipboardCheck } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  ConditionRuleBuilder,
  type ConditionSource,
} from "~/features/forms/components/ConditionRuleBuilder";
import { summarizeCondition } from "../requirement-scope";
import type { ServiceFormValues } from "../service-form.config";

export type RequirementValue = ServiceFormValues["requirements"][number];

/** Up to this many roles are shown as buttons; more fall back to a select. */
const MAX_ROLE_BUTTONS = 4;

const UPLOAD_SCOPES = [
  { value: "request", label: "Once per request" },
  { value: "each_subject", label: "Every person" },
  { value: "specific_subject", label: "One specific person" },
] as const;

/** Section titles in the sheet: small, uppercase, quiet. */
const LEGEND_CLASS =
  "text-xs font-semibold tracking-wide text-muted-foreground uppercase";

interface RequirementSheetProps {
  /** Real field-array index of the requirement being configured. */
  index: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A row just added and not yet confirmed: discarding removes it. */
  isNew: boolean;
  onDiscardNew: () => void;
  conditionSources: ConditionSource[];
  partyRoles: string[];
}

export function RequirementSheet({
  index,
  open,
  onOpenChange,
  isNew,
  onDiscardNew,
  conditionSources,
  partyRoles,
}: RequirementSheetProps) {
  const form = useFormContext<ServiceFormValues>();
  const requirements = useWatch({ control: form.control, name: "requirements" });
  const initialValueRef = useRef<RequirementValue | null>(null);

  // Snapshot the row each time the sheet opens, so Discard Changes can revert.
  useEffect(() => {
    if (!open || index === null) return;
    initialValueRef.current = structuredClone(
      form.getValues(`requirements.${index}`),
    );
  }, [form, open, index]);

  const value = index === null ? undefined : requirements?.[index];
  // The row can be gone (removed by Discard on a new row) while the sheet
  // animates out; never mount fields for an index that no longer exists.
  if (index === null || !value) return null;

  // Closing the sheet any way (X, Esc, outside click, Done) keeps what was
  // typed, because it is already part of the form. Only "Discard Changes"
  // reverts to how the row looked when the sheet opened.
  function discardChanges() {
    if (isNew) {
      onDiscardNew();
      return;
    }
    if (index !== null && initialValueRef.current) {
      form.setValue(`requirements.${index}`, initialValueRef.current, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    onOpenChange(false);
  }

  const name = value.requirement_name?.trim() || "Untitled requirement";
  const requiresUpload = value.requires_upload ?? true;
  const uploadScope = value.upload_scope ?? "request";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
      <SheetHeader className="border-b border-border pr-14">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"
          >
            <ClipboardCheck className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <SheetTitle>Configure Requirement</SheetTitle>
            <SheetDescription className="line-clamp-2 break-words">
              {name}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <FieldGroup className="gap-6">
          <FieldSet>
            <FieldLegend variant="label" className={LEGEND_CLASS}>
              Requirement
            </FieldLegend>
            <FieldGroup className="gap-4">
              <Controller
                control={form.control}
                name={`requirements.${index}.requirement_name`}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`requirement-name-${index}`}>
                      Title
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
                    ) : (
                      <FieldDescription>
                        Shown on the applicant&rsquo;s checklist.
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />

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
                  <Field
                    orientation="horizontal"
                    className="gap-4 has-[>[data-slot=field-content]]:items-start sm:has-[>[data-slot=field-content]]:items-center"
                  >
                    <FieldContent className="min-w-0">
                      <FieldLabel htmlFor={`requirement-mandatory-${index}`}>
                        Required
                      </FieldLabel>
                      <FieldDescription>
                        Turn off for items that only apply if the applicant
                        has them.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id={`requirement-mandatory-${index}`}
                      name={field.name}
                      className="ml-auto shrink-0"
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label" className={LEGEND_CLASS}>
              File Upload
            </FieldLegend>
            <Card size="sm" className="bg-surface-subtle shadow-none">
              <CardContent className="flex flex-col gap-4">
                <Controller
                  control={form.control}
                  name={`requirements.${index}.requires_upload`}
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldLabel
                          htmlFor={`requirement-upload-${index}`}
                        >
                          Applicant must upload a file
                        </FieldLabel>
                        <FieldDescription>
                          Turn this off for an in-person action or
                          reminder.
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        id={`requirement-upload-${index}`}
                        name={field.name}
                        className="ml-auto shrink-0"
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </Field>
                  )}
                />

                {requiresUpload ? (
                  <FieldGroup className="gap-4 border-t border-border pt-4">
                    <Controller
                      control={form.control}
                      name={`requirements.${index}.upload_scope`}
                      render={({ field }) => (
                        <FieldSet>
                          <FieldLegend variant="label" className="mb-2">
                            Who Must Upload
                          </FieldLegend>
                          <ToggleGroup
                            aria-label="Who must upload"
                            variant="outline"
                            spacing={2}
                            value={[field.value ?? "request"]}
                            // A pressed toggle can be pressed again to clear
                            // it; a scope is always one of the three.
                            onValueChange={(next) => {
                              if (next[0]) field.onChange(next[0]);
                            }}
                            className="grid w-full grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]"
                          >
                            {UPLOAD_SCOPES.map((scope) => (
                              <ToggleGroupItem
                                key={scope.value}
                                value={scope.value}
                                className="min-h-11 bg-background aria-pressed:border-primary/40 aria-pressed:bg-primary-soft aria-pressed:text-primary"
                              >
                                {scope.label}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                        </FieldSet>
                      )}
                    />

                    {uploadScope === "specific_subject" ? (
                      <Controller
                        control={form.control}
                        name={`requirements.${index}.subject_role`}
                        render={({ field, fieldState }) =>
                          partyRoles.length > 0 &&
                          partyRoles.length <= MAX_ROLE_BUTTONS ? (
                            <FieldSet data-invalid={fieldState.invalid}>
                              <FieldLegend
                                variant="label"
                                className="mb-2"
                              >
                                Which Person
                              </FieldLegend>
                              <ToggleGroup
                                aria-label="Which person"
                                variant="outline"
                                spacing={2}
                                value={field.value ? [field.value] : []}
                                onValueChange={(next) => {
                                  if (next[0]) field.onChange(next[0]);
                                }}
                                className="grid w-full grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]"
                              >
                                {partyRoles.map((role) => (
                                  <ToggleGroupItem
                                    key={role}
                                    value={role}
                                    className="min-h-11 bg-background aria-pressed:border-primary/40 aria-pressed:bg-primary-soft aria-pressed:text-primary"
                                  >
                                    {role}
                                  </ToggleGroupItem>
                                ))}
                              </ToggleGroup>
                              {fieldState.invalid ? (
                                <FieldError
                                  errors={[fieldState.error]}
                                />
                              ) : null}
                            </FieldSet>
                          ) : (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel
                                htmlFor={`requirement-subject-role-${index}`}
                              >
                                Which Person
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
                                <FieldError
                                  errors={[fieldState.error]}
                                />
                              ) : null}
                            </Field>
                          )
                        }
                      />
                    ) : null}
                  </FieldGroup>
                ) : null}
              </CardContent>
            </Card>
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label" className={LEGEND_CLASS}>
              When It Applies
            </FieldLegend>
            <Controller
              control={form.control}
              name={`requirements.${index}.applies_when`}
              render={({ field }) => (
                <FieldGroup className="gap-3">
                  <ConditionRuleBuilder
                    idPrefix={`requirement-${index}-condition`}
                    rule={field.value ?? null}
                    sources={conditionSources}
                    lead="Applies when"
                    emptyLabel="Applies to every applicant for the selected service."
                    onChange={field.onChange}
                  />
                  <Alert variant="success" aria-live="polite">
                    <CircleCheck aria-hidden="true" />
                    <AlertDescription>
                      <span className="font-medium">
                        What applicants see:
                      </span>{" "}
                      {field.value
                        ? `Applicants will see this requirement when ${summarizeCondition(field.value, conditionSources, true)}.`
                        : "Every applicant for this service will see this requirement."}
                    </AlertDescription>
                  </Alert>
                  {field.value &&
                  form.getValues(`requirements.${index}.case_tag`) ? (
                    <FieldDescription>
                      This row also carries a legacy case tag. The
                      condition above takes precedence.
                    </FieldDescription>
                  ) : null}
                </FieldGroup>
              )}
            />
          </FieldSet>
        </FieldGroup>
      </div>

      <SheetFooter className="border-t border-border sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11"
          onClick={discardChanges}
        >
          Discard Changes
        </Button>
        <Button
          type="button"
          size="lg"
          className="min-h-11"
          onClick={() => onOpenChange(false)}
        >
          Done
        </Button>
      </SheetFooter>
    </SheetContent>
    </Sheet>
  );
}
