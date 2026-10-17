import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Check,
  CircleCheck,
  ClipboardCheck,
  Copy,
  Lock,
  Minus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
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
  SheetTrigger,
} from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  ConditionRuleBuilder,
  type ConditionSource,
} from "~/features/forms/components/ConditionRuleBuilder";
import { cn } from "~/lib/utils";
import { summarizeCondition, type RequirementScope } from "../requirement-scope";
import type { ServiceFormValues } from "../service-form.config";

export type RequirementValue = ServiceFormValues["requirements"][number];

/** Up to this many roles are shown as buttons; more fall back to a select. */
const MAX_ROLE_BUTTONS = 4;

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

/** Section titles in the sheet: small, uppercase, quiet. */
const LEGEND_CLASS =
  "text-xs font-semibold tracking-wide text-muted-foreground uppercase";

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
  const [isOpen, setIsOpen] = useState(false);
  const initialValueRef = useRef<RequirementValue | null>(null);
  const requirementPath = `requirements.${index}` as const;

  useEffect(() => {
    if (!initiallyOpen || locked) return;
    initialValueRef.current = structuredClone(form.getValues(requirementPath));
    setIsOpen(true);
  }, [form, initiallyOpen, locked, requirementPath]);

  // Closing the sheet any way (X, Esc, outside click, Done) keeps what was
  // typed, because it is already part of the form. Only "Discard Changes"
  // reverts to how the row looked when the sheet opened.
  function handleOpenChange(open: boolean) {
    if (open && !isOpen) {
      initialValueRef.current = structuredClone(form.getValues(requirementPath));
    }
    setIsOpen(open);
  }

  function discardChanges() {
    if (initialValueRef.current) {
      form.setValue(requirementPath, initialValueRef.current, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    setIsOpen(false);
  }

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
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <div className="rounded-lg border border-border bg-background">
        <div className="flex flex-wrap items-start justify-end gap-2 p-3 sm:flex-nowrap">
          <div className="flex min-w-0 flex-1 basis-full items-start gap-2 text-left sm:basis-auto">
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
                <span className="break-words text-sm font-medium text-foreground">
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
              <span className="break-words text-xs text-muted-foreground">
                {conditionLine}
              </span>
            </span>
          </div>

          {scope.kind === "inherited" && onOverride ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
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
              size="icon"
              className="size-11 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label={`Remove ${name}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          ) : null}

          {locked ? (
            <span
              role="img"
              className="mt-1 text-muted-foreground"
              aria-label="Inherited from the group checklist. Unlock the group to edit."
              title="Inherited from the group checklist. Unlock the group to edit."
            >
              <Lock aria-hidden="true" className="size-4" />
            </span>
          ) : (
            <SheetTrigger
              aria-label={`Configure ${name}. ${conditionLine}`}
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                />
              }
            >
              <SlidersHorizontal aria-hidden="true" data-icon="inline-start" />
              Configure
            </SheetTrigger>
          )}
        </div>

        {!locked ? (
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
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend variant="label" className={LEGEND_CLASS}>
                    Is It Required?
                  </FieldLegend>
                  <Controller
                    control={form.control}
                    name={`requirements.${index}.is_mandatory`}
                    render={({ field }) => (
                      <ToggleGroup
                        aria-label="Is it required?"
                        spacing={1}
                        value={[field.value ? "required" : "conditional"]}
                        // A pressed toggle can be pressed again to clear it;
                        // a requirement is always one or the other.
                        onValueChange={(next) => {
                          if (next[0]) field.onChange(next[0] === "required");
                        }}
                        className="grid w-full grid-cols-2 rounded-lg bg-muted p-1"
                      >
                        <ToggleGroupItem
                          value="required"
                          className="min-h-11 aria-pressed:bg-background aria-pressed:shadow-sm"
                        >
                          Required
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="conditional"
                          className="min-h-11 aria-pressed:bg-background aria-pressed:shadow-sm"
                        >
                          If applicable
                        </ToggleGroupItem>
                      </ToggleGroup>
                    )}
                  />
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
                              <Field>
                                <FieldLabel
                                  htmlFor={`requirement-upload-scope-${index}`}
                                >
                                  Who Must Upload
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
                              </Field>
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
                onClick={() => setIsOpen(false)}
              >
                Done
              </Button>
            </SheetFooter>
          </SheetContent>
        ) : null}
      </div>
    </Sheet>
  );
}
