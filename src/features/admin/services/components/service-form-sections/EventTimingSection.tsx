import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type {
  EventTimingBehavior,
  EventTimingMismatch,
  EventTimingRule,
  FormTemplateDefinition,
} from "~/features/forms/form-template.types";

export const TIMING_BEHAVIORS: {
  value: EventTimingBehavior;
  label: string;
  hint: string;
}[] = [
  {
    value: "redirect_confirm",
    label: "Offer a switch (recommended)",
    hint: "Warn the applicant and let them confirm a switch to the matching service.",
  },
  {
    value: "block",
    label: "Block with no alternative",
    hint: "Stop the applicant; no switch is offered.",
  },
  {
    value: "warn_allow",
    label: "Warn but allow",
    hint: "Show the warning; the applicant may continue.",
  },
  {
    value: "auto_route",
    label: "Switch automatically",
    hint: "Switch as soon as the date is chosen.",
  },
];

export const TIMING_MISMATCHES: {
  value: EventTimingMismatch;
  label: string;
}[] = [
  { value: "outside_window", label: "Date is outside the window" },
  { value: "inside_window", label: "Date is inside the window" },
];

interface EventTimingSectionProps {
  id?: string;
  formDefinition: FormTemplateDefinition;
  targetOptions: { value: string; label: string }[];
  onFormDefinitionChange: (definition: FormTemplateDefinition) => void;
}

/**
 * Shared editor for a service form's data-driven on-time window. Used by both
 * the full service dossier (via Case Questions) and the group-wide shared
 * application editor, so grouped and standalone services configure it the same
 * way. The rule is stored in the versioned form template definition.
 */
export function EventTimingSection({
  id,
  formDefinition,
  targetOptions,
  onFormDefinitionChange,
}: EventTimingSectionProps) {
  const caseDateFields = formDefinition.sections
    .filter((section) => section.step === "case")
    .flatMap((section) => section.fields)
    .filter((field) => field.type === "date");
  const timing = formDefinition.eventTiming;

  function updateTiming(patch: Partial<EventTimingRule>) {
    if (!timing) return;
    onFormDefinitionChange({
      ...formDefinition,
      eventTiming: { ...timing, ...patch },
    });
  }

  function enableTiming() {
    onFormDefinitionChange({
      ...formDefinition,
      eventTiming: {
        triggerField: caseDateFields[0]?.key ?? "event_date",
        windowDays: 30,
        mismatch: "outside_window",
        targetServiceCode: targetOptions[0]?.value ?? "",
        behavior: "redirect_confirm",
        requireDocumentFirst: false,
        timezone: "Asia/Manila",
        title: "This date is outside the on-time window",
        description: "Use the registration track that matches the event date.",
        ctaLabel: "Switch registration track",
      },
    });
  }

  return (
    <FieldSet
      id={id}
      className="scroll-mt-6 gap-4 rounded-lg border border-border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <FieldLegend variant="label" className="mb-0">
            Registration window &amp; routing
          </FieldLegend>
          <FieldDescription>
            Declare this service&rsquo;s on-time window (in days) and what
            happens when the applicant&rsquo;s event date falls outside it. The
            rule is reusable by any service — grouped or standalone — and takes
            effect on the next publish.
          </FieldDescription>
        </div>
        {timing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onFormDefinitionChange({
                ...formDefinition,
                eventTiming: undefined,
              })
            }
          >
            Remove rule
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={caseDateFields.length === 0}
            onClick={enableTiming}
          >
            Add window rule
          </Button>
        )}
      </div>

      {!timing ? (
        <FieldDescription>
          {caseDateFields.length === 0
            ? "Add a date field to the case step before configuring a window."
            : "No window rule yet. Applicants see no track prompt for this service."}
        </FieldDescription>
      ) : (
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="timing-trigger-field">
                Trigger date field
              </FieldLabel>
              <Select
                value={timing.triggerField}
                onValueChange={(value) =>
                  value && updateTiming({ triggerField: value })
                }
              >
                <SelectTrigger id="timing-trigger-field" className="w-full">
                  <SelectValue>
                    {(value) =>
                      caseDateFields.find((field) => field.key === value)
                        ?.label ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {caseDateFields.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="timing-window-days">
                On-time window (days)
              </FieldLabel>
              <Input
                id="timing-window-days"
                type="number"
                min={0}
                max={3660}
                value={String(timing.windowDays)}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  updateTiming({
                    windowDays: Number.isFinite(parsed)
                      ? Math.max(0, Math.min(3660, Math.trunc(parsed)))
                      : 0,
                  });
                }}
                inputMode="numeric"
              />
              <FieldDescription>
                Inclusive: a date exactly this many days ago is still on-time.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="timing-mismatch">
                This service is the wrong track when the date is
              </FieldLabel>
              <Select
                value={timing.mismatch}
                onValueChange={(value) =>
                  value &&
                  updateTiming({ mismatch: value as EventTimingMismatch })
                }
              >
                <SelectTrigger id="timing-mismatch" className="w-full">
                  <SelectValue>
                    {(value) =>
                      TIMING_MISMATCHES.find((item) => item.value === value)
                        ?.label ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TIMING_MISMATCHES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="timing-target">
                Switch the applicant to
              </FieldLabel>
              <Select
                value={timing.targetServiceCode}
                onValueChange={(value) =>
                  value && updateTiming({ targetServiceCode: value })
                }
              >
                <SelectTrigger id="timing-target" className="w-full">
                  <SelectValue>
                    {(value) =>
                      targetOptions.find((option) => option.value === value)
                        ?.label ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {targetOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                The matching service or service group for the other track.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="timing-behavior">
                When the date mismatches
              </FieldLabel>
              <Select
                value={timing.behavior}
                onValueChange={(value) =>
                  value &&
                  updateTiming({ behavior: value as EventTimingBehavior })
                }
              >
                <SelectTrigger id="timing-behavior" className="w-full">
                  <SelectValue>
                    {(value) =>
                      TIMING_BEHAVIORS.find((item) => item.value === value)
                        ?.label ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TIMING_BEHAVIORS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                {
                  TIMING_BEHAVIORS.find((item) => item.value === timing.behavior)
                    ?.hint
                }
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="timing-timezone">Timezone</FieldLabel>
              <Input
                id="timing-timezone"
                value={timing.timezone}
                onChange={(event) =>
                  updateTiming({ timezone: event.target.value })
                }
                placeholder="Asia/Manila"
                className="font-mono"
                autoComplete="off"
              />
              <FieldDescription>
                The window is measured in registry-local time.
              </FieldDescription>
            </Field>
          </div>

          <Field orientation="horizontal">
            <Checkbox
              id="timing-require-document"
              checked={timing.requireDocumentFirst}
              onCheckedChange={(checked) =>
                updateTiming({ requireDocumentFirst: checked === true })
              }
            />
            <FieldContent>
              <FieldLabel htmlFor="timing-require-document">
                Require the supporting document before the date check
              </FieldLabel>
              <FieldDescription>
                Defer routing until the applicant uploads the document; the date
                is validated against it later.
              </FieldDescription>
            </FieldContent>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="timing-title">Alert title</FieldLabel>
              <Input
                id="timing-title"
                value={timing.title}
                onChange={(event) =>
                  updateTiming({ title: event.target.value })
                }
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="timing-cta">Button label</FieldLabel>
              <Input
                id="timing-cta"
                value={timing.ctaLabel}
                onChange={(event) =>
                  updateTiming({ ctaLabel: event.target.value })
                }
                autoComplete="off"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="timing-description">
              Alert description
            </FieldLabel>
            <Textarea
              id="timing-description"
              rows={2}
              maxLength={500}
              value={timing.description}
              onChange={(event) =>
                updateTiming({ description: event.target.value })
              }
            />
          </Field>
        </FieldGroup>
      )}
    </FieldSet>
  );
}
