import { useRef, useState } from "react";
import { CalendarClock, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
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

/** The words that fill the sentence; TIMING_MISMATCHES keeps the long labels. */
const SENTENCE_SIDES: { value: EventTimingMismatch; label: string }[] = [
  { value: "outside_window", label: "outside" },
  { value: "inside_window", label: "inside" },
];

/** Only these responses send applicants to another service. */
const ROUTING_BEHAVIORS: EventTimingBehavior[] = [
  "redirect_confirm",
  "auto_route",
];

/** Behaviors whose applicant alert carries the action button. */
const CTA_BEHAVIORS: EventTimingBehavior[] = ["redirect_confirm", "warn_allow"];

const PREVIEW_CAPTIONS: Record<EventTimingBehavior, string> = {
  redirect_confirm: "Applicants choose whether to switch.",
  warn_allow: "Applicants can keep going on this service.",
  block: "Applicants can’t continue past this step.",
  auto_route: "Applicants are moved right away.",
};

/**
 * Inline controls in the rule sentence: a soft primary pill, not an outlined
 * field, so the rule reads as a sentence. Widths are set where each is used.
 */
const INLINE_CONTROL =
  "h-10 border-transparent bg-primary-soft font-semibold text-primary shadow-none hover:border-primary/40 aria-invalid:bg-destructive/10 aria-invalid:text-destructive";

/** The small "When" / "Then" tag at the start of each sentence row. */
const LEAD_CLASS =
  "w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-bold tracking-widest text-primary uppercase sm:mt-2";

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
  /**
   * The `targetOptions` value that identifies the service being edited (its
   * display group, or its own code when standalone). Used only to warn when
   * the rule would route applicants to the service they are already on.
   */
  currentServiceCode?: string | null;
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
  currentServiceCode,
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

  const activeBehavior = timing
    ? TIMING_BEHAVIORS.find((item) => item.value === timing.behavior)
    : undefined;
  const zone = zoneDraft ?? timing?.timezone ?? "";
  const zoneInvalid = !isValidTimeZone(zone);
  const routes = timing ? ROUTING_BEHAVIORS.includes(timing.behavior) : false;
  const targetValid = timing
    ? targetOptions.some((option) => option.value === timing.targetServiceCode)
    : false;
  // Saving needs a valid target whenever a rule exists, even for responses that
  // never switch applicants, so a missing one must stay reachable to fix.
  const showTarget = routes || !targetValid;
  const routesToSelf =
    routes &&
    Boolean(currentServiceCode) &&
    timing?.targetServiceCode === currentServiceCode;
  const showsCta = timing ? CTA_BEHAVIORS.includes(timing.behavior) : false;

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
        <FieldGroup className="gap-6">
          <div
            role="group"
            aria-label="Registration window rule"
            className="flex flex-col gap-6"
          >
            <div className="grid gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-4">
              <span className={LEAD_CLASS}>When</span>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-base">
                  <Select
                    value={timing.triggerField}
                    onValueChange={(value) =>
                      value && updateTiming({ triggerField: value })
                    }
                  >
                    <SelectTrigger
                      id="timing-trigger-field"
                      aria-label="Trigger date"
                      className={`${INLINE_CONTROL} w-56 max-w-full`}
                    >
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
                  <span>falls</span>
                  <Select
                    value={timing.mismatch}
                    onValueChange={(value) =>
                      value &&
                      updateTiming({ mismatch: value as EventTimingMismatch })
                    }
                  >
                    <SelectTrigger
                      id="timing-mismatch"
                      aria-label="Which side of the window the date falls on"
                      className={`${INLINE_CONTROL} w-28`}
                    >
                      <SelectValue>
                        {(value) =>
                          SENTENCE_SIDES.find((item) => item.value === value)
                            ?.label ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {SENTENCE_SIDES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <span>the</span>
                  <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                    <Input
                      id="timing-window-days"
                      name="window_days"
                      type="number"
                      min={0}
                      max={3660}
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="On-time window length in days"
                      className={`${INLINE_CONTROL} w-20 text-center tabular-nums`}
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
                    <span>-day</span>
                  </span>
                  <span>on-time window.</span>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-base">
                  <span>Days are counted in</span>
                  <Input
                    id="timing-timezone"
                    name="timing_timezone"
                    aria-label="Timezone"
                    aria-describedby={
                      zoneInvalid ? "timing-timezone-error" : undefined
                    }
                    className={`${INLINE_CONTROL} w-44 max-w-full`}
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
                  <span>.</span>
                </div>
                {zoneInvalid ? (
                  <FieldError
                    id="timing-timezone-error"
                    errors={[
                      { message: "Enter a timezone name, such as Asia/Manila." },
                    ]}
                  />
                ) : null}
                <FieldDescription>
                  Choose “outside” for an on-time service and “inside” for its
                  delayed counterpart.
                </FieldDescription>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-4">
              <span className={LEAD_CLASS}>Then</span>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-base">
                  <Select
                    value={timing.behavior}
                    onValueChange={(value) =>
                      value &&
                      updateTiming({ behavior: value as EventTimingBehavior })
                    }
                  >
                    <SelectTrigger
                      id="timing-behavior"
                      aria-label="What happens then"
                      className={`${INLINE_CONTROL} w-64 max-w-full`}
                    >
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
                </div>
                <FieldDescription aria-live="polite">
                  {activeBehavior?.hint}
                </FieldDescription>

                {showTarget ? (
                  <Field className="max-w-sm">
                    <FieldLabel htmlFor="timing-target">
                      Alternate Service Track
                    </FieldLabel>
                    <Select
                      value={timing.targetServiceCode}
                      onValueChange={(value) =>
                        value && updateTiming({ targetServiceCode: value })
                      }
                    >
                      <SelectTrigger
                        id="timing-target"
                        className="w-full"
                        aria-describedby={
                          routesToSelf
                            ? "timing-target-self"
                            : !routes
                              ? "timing-target-required"
                              : undefined
                        }
                      >
                        <SelectValue placeholder="Choose a track">
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
                    {!routes ? (
                      <FieldDescription id="timing-target-required">
                        This response doesn’t switch applicants, but saving
                        still needs a valid track here.
                      </FieldDescription>
                    ) : null}
                    {routesToSelf ? (
                      <Alert
                        id="timing-target-self"
                        variant="warning"
                        role="status"
                      >
                        <TriangleAlert aria-hidden="true" />
                        <AlertTitle>This rule would route to itself</AlertTitle>
                        <AlertDescription>
                          This is the service you’re editing. Pick a different
                          track so applicants have somewhere to go.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </Field>
                ) : null}
              </div>
            </div>
          </div>

          <Field
            orientation="horizontal"
            className="items-start gap-4 rounded-lg border border-border bg-card p-4 sm:items-center"
          >
            <FieldContent className="min-w-0 gap-1.5">
              <FieldLabel htmlFor="timing-require-document">
                Require the supporting document before the date check
              </FieldLabel>
              <FieldDescription id="timing-require-document-help">
                Applicants upload it first, then the date is checked.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="timing-require-document"
              className="ml-auto shrink-0"
              aria-describedby="timing-require-document-help"
              checked={timing.requireDocumentFirst}
              onCheckedChange={(checked) =>
                updateTiming({ requireDocumentFirst: checked })
              }
            />
          </Field>

          <FieldSet className="gap-3">
            <FieldLegend variant="label" className="mb-0">
              What Applicants See
            </FieldLegend>
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <FieldGroup className="min-w-0 gap-4">
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
                <Field>
                  <FieldLabel htmlFor="timing-description">
                    Alert Description
                  </FieldLabel>
                  <Textarea
                    id="timing-description"
                    name="timing_description"
                    rows={3}
                    maxLength={500}
                    value={timing.description}
                    onChange={(event) =>
                      updateTiming({ description: event.target.value })
                    }
                  />
                </Field>
              </FieldGroup>

              <div className="flex min-w-0 flex-col gap-3 self-start rounded-lg border border-border bg-muted/40 p-4">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Preview
                </span>
                <Alert
                  variant="warning"
                  role="group"
                  aria-label="Preview of the alert applicants see"
                >
                  <CalendarClock aria-hidden="true" />
                  <AlertTitle className="break-words">
                    {timing.title.trim() || (
                      <span className="font-normal text-muted-foreground italic">
                        Add an alert title
                      </span>
                    )}
                  </AlertTitle>
                  <AlertDescription className="min-w-0 break-words">
                    {timing.description.trim() || (
                      <span className="italic">Add a short description</span>
                    )}
                    {showsCta && timing.ctaLabel.trim() ? (
                      <span className="mt-3 flex">
                        <span className="inline-flex min-h-9 items-center rounded-full border border-warning-border bg-background/70 px-4 text-sm font-semibold break-words text-warning-strong">
                          {timing.ctaLabel}
                        </span>
                      </span>
                    ) : null}
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  {PREVIEW_CAPTIONS[timing.behavior]}
                </p>
              </div>
            </div>
          </FieldSet>

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
