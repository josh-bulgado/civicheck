import { useRef, useState } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
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
    label: "Offer switch",
    hint: "Applicants are offered a switch to the alternate track.",
  },
  {
    value: "warn_allow",
    label: "Warn only",
    hint: "Applicant sees a warning and may continue on this service.",
  },
  {
    value: "block",
    label: "Block entry",
    hint: "Applicants can’t continue, and no switch is offered.",
  },
  {
    value: "auto_route",
    label: "Switch automatically",
    hint: "Applicants move to the alternate track as soon as they pick the date.",
  },
];

export const TIMING_MISMATCHES: {
  value: EventTimingMismatch;
  label: string;
}[] = [
  { value: "outside_window", label: "Outside the window" },
  { value: "inside_window", label: "Inside the window" },
];

/** Selected segment is the solid primary button; the rest stay quiet. */
const SEGMENT_CLASS =
  "h-auto min-h-11 bg-muted/40 py-2 text-center whitespace-normal aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground";

/** A collapsible row: chevron, title, and a muted hint pushed to the right. */
const DISCLOSURE_CLASS =
  "group h-auto min-h-11 w-full justify-start gap-2 bg-muted/40 px-3 py-2 text-left whitespace-normal";

function isValidTimeZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

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

  const latestDefinition = useRef(formDefinition);
  latestDefinition.current = formDefinition;
  // Typing a number or a timezone passes through invalid states (empty, half a
  // zone name). These drafts hold the text; only a valid value reaches the rule.
  const [daysDraft, setDaysDraft] = useState<string | null>(null);
  const [zoneDraft, setZoneDraft] = useState<string | null>(null);

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

  function removeTiming() {
    if (!timing) return;
    const removed = timing;
    onFormDefinitionChange({ ...formDefinition, eventTiming: undefined });
    toast("Window rule removed", {
      action: {
        label: "Undo",
        // Restore into whatever the definition is by then, not the snapshot
        // taken at removal, so edits made in between are not lost.
        onClick: () =>
          onFormDefinitionChange({
            ...latestDefinition.current,
            eventTiming: removed,
          }),
      },
    });
  }

  const triggerLabel = timing
    ? (caseDateFields.find((field) => field.key === timing.triggerField)
        ?.label ?? timing.triggerField)
    : "";
  const activeBehavior = timing
    ? TIMING_BEHAVIORS.find((item) => item.value === timing.behavior)
    : undefined;
  const side = timing?.mismatch === "inside_window" ? "inside" : "outside";
  const zone = zoneDraft ?? timing?.timezone ?? "";
  const zoneInvalid = !isValidTimeZone(zone);

  return (
    <FieldSet
      id={id}
      className="scroll-mt-6 gap-5 rounded-lg border border-border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <FieldLegend variant="label" className="mb-0">
            Registration Window &amp; Routing
          </FieldLegend>
          <FieldDescription>
            Route applicants to the right track when their event date falls
            outside the on-time window.
          </FieldDescription>
        </div>
        {!timing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={caseDateFields.length === 0}
            onClick={enableTiming}
          >
            Add Window Rule
          </Button>
        ) : null}
      </div>

      {!timing ? (
        <FieldDescription>
          {caseDateFields.length === 0
            ? "Add a date field to the Application Form before setting a window rule."
            : "No window rule yet. Applicants see no track prompt for this service."}
        </FieldDescription>
      ) : (
        <FieldGroup className="gap-5">
          <div className="flex flex-col gap-2">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_12rem]">
              <Field>
                <FieldLabel htmlFor="timing-trigger-field">
                  Trigger Date
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
                  On-Time Limit
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="timing-window-days"
                    name="window_days"
                    type="number"
                    min={0}
                    max={3660}
                    inputMode="numeric"
                    autoComplete="off"
                    value={daysDraft ?? String(timing.windowDays)}
                    onChange={(event) => {
                      const text = event.target.value;
                      setDaysDraft(text);
                      const parsed = Number(text);
                      if (text !== "" && Number.isFinite(parsed)) {
                        updateTiming({
                          windowDays: Math.max(
                            0,
                            Math.min(3660, Math.trunc(parsed)),
                          ),
                        });
                      }
                    }}
                    onBlur={() => setDaysDraft(null)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>days</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>

              <Field data-invalid={zoneInvalid}>
                <FieldLabel htmlFor="timing-timezone">Timezone</FieldLabel>
                <Input
                  id="timing-timezone"
                  name="timing_timezone"
                  value={zone}
                  onChange={(event) => {
                    const text = event.target.value;
                    setZoneDraft(text);
                    if (isValidTimeZone(text.trim())) {
                      updateTiming({ timezone: text.trim() });
                    }
                  }}
                  onBlur={() => setZoneDraft(null)}
                  placeholder="Asia/Manila"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={zoneInvalid}
                />
              </Field>
            </div>
            {zoneInvalid ? (
              <FieldError
                errors={[{ message: "Enter a timezone name, such as Asia/Manila." }]}
              />
            ) : null}
          </div>

          <Field>
            <FieldLabel htmlFor="timing-target">Alternate Service Track</FieldLabel>
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
          </Field>

          <FieldSet className="gap-2">
            <FieldLegend variant="label" className="mb-0">
              When {side === "outside" ? "Outside" : "Inside"} Window
            </FieldLegend>
            <ToggleGroup
              aria-label={`What happens when the date is ${side} the window`}
              variant="outline"
              spacing={2}
              value={[timing.behavior]}
              onValueChange={(next) => {
                if (next[0]) {
                  updateTiming({ behavior: next[0] as EventTimingBehavior });
                }
              }}
              className="grid w-full grid-cols-2 sm:grid-cols-4"
            >
              {TIMING_BEHAVIORS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className={SEGMENT_CLASS}
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription aria-live="polite">
              {activeBehavior?.hint}
            </FieldDescription>
          </FieldSet>

          <div className="flex flex-col gap-2">
            <Collapsible>
              <CollapsibleTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={DISCLOSURE_CLASS}
                  />
                }
              >
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90"
                />
                <span className="text-sm font-medium">
                  Advanced Settings &amp; Verification
                </span>
                <span className="ml-auto hidden text-xs font-normal text-muted-foreground sm:inline">
                  Date condition &amp; document check
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-1 pt-4">
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="timing-mismatch">
                      Route Applicants Away When the Date Is
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
                            TIMING_MISMATCHES.find(
                              (item) => item.value === value,
                            )?.label ?? value
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
                    <FieldDescription>
                      Choose “Outside the window” for an on-time service and “Inside the window” for its delayed counterpart.
                    </FieldDescription>
                  </Field>

                  <Field orientation="horizontal">
                    <Checkbox
                      id="timing-require-document"
                      checked={timing.requireDocumentFirst}
                      onCheckedChange={(checked) =>
                        updateTiming({
                          requireDocumentFirst: checked === true,
                        })
                      }
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="timing-require-document">
                        Require the supporting document before the date check
                      </FieldLabel>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={DISCLOSURE_CLASS}
                  />
                }
              >
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90"
                />
                <span className="text-sm font-medium">
                  Alert Shown to Applicants
                </span>
                <span className="ml-auto hidden text-xs font-normal text-muted-foreground sm:inline">
                  Title, message &amp; button
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-1 pt-4">
                <FieldGroup className="gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="timing-title">Alert Title</FieldLabel>
                      <Input
                        id="timing-title"
                        name="timing_title"
                        maxLength={160}
                        value={timing.title}
                        onChange={(event) =>
                          updateTiming({ title: event.target.value })
                        }
                        autoComplete="off"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="timing-cta">Button Label</FieldLabel>
                      <Input
                        id="timing-cta"
                        name="timing_cta"
                        maxLength={80}
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
                      Alert Description
                    </FieldLabel>
                    <Textarea
                      id="timing-description"
                      name="timing_description"
                      rows={2}
                      maxLength={500}
                      value={timing.description}
                      onChange={(event) =>
                        updateTiming({ description: event.target.value })
                      }
                    />
                  </Field>
                </FieldGroup>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={removeTiming}
            >
              <Trash2 aria-hidden="true" data-icon="inline-start" />
              Remove Rule
            </Button>
          </div>
        </FieldGroup>
      )}
    </FieldSet>
  );
}
