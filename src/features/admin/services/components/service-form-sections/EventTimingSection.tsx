import { useState } from "react";
import { GitBranch, TriangleAlert, Zap } from "lucide-react";
import { Button } from "~/components/ui/button";
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
import { IconTile } from "~/components/ui/icon-tile";
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
import { EventTimingNotice } from "~/features/forms/components/EventTimingNotice";
import { TIMING_NOTICE } from "~/features/forms/event-timing-tone";
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

const PREVIEW_CAPTIONS: Record<EventTimingBehavior, string> = {
  redirect_confirm: "Applicants choose whether to switch.",
  warn_allow: "Applicants can keep going on this service.",
  block: "Applicants can’t continue past this step.",
  auto_route: "Applicants are moved right away.",
};

/**
 * Inline controls in the rule sentence: a soft primary pill, not an outlined
 * field, so the rule reads as a sentence. Widths are set where each is used.
 * `data-inline-control` lets the editor's type rules size them for the sentence.
 */
const INLINE_CONTROL =
  "h-10 rounded-xl border-transparent bg-primary-soft font-semibold text-primary shadow-none hover:border-primary/40 data-[size=default]:h-10 aria-invalid:bg-destructive/10 aria-invalid:text-destructive [&_svg]:text-primary";

/** Hides the number input's spinner; the pill is typed into, not stepped. */
const NO_SPINNER =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** The small "When" / "Then" tag at the start of each sentence row. */
const LEAD_CLASS =
  "w-fit self-start rounded-full bg-primary-soft px-3 py-1 text-xs font-bold tracking-[0.08em] text-primary uppercase sm:mt-1.5";

/** One sentence row: the tag, then the clause. */
const RULE_ROW = "grid gap-2 sm:grid-cols-[4.75rem_minmax(0,1fr)] sm:gap-x-[18px]";

/** A sentence of pills and plain words. */
const CLAUSE =
  "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3 text-lg tracking-[-0.01em] text-body";

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
 * Editor for a service form's data-driven on-time window. It sits in the
 * Registration Window band of Timing & Routing, whose title and Remove Rule
 * button belong to the band. The rule is stored in the versioned form template
 * definition.
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
  const showsCta = timing ? TIMING_NOTICE[timing.behavior].cta : false;
  const targetLabel =
    targetOptions.find((option) => option.value === timing?.targetServiceCode)
      ?.label ?? "the alternate track";

  return (
    <FieldSet id={id} className="scroll-mt-6 gap-6">
      <FieldLegend className="sr-only">Registration window and routing</FieldLegend>

      {!timing ? (
        <div className="flex flex-col items-center gap-3 px-4 pt-8 pb-10 text-center">
          <IconTile icon={GitBranch} size="lg" />
          <h3 className="text-lg font-bold tracking-tight">No Window Rule Yet</h3>
          <p className="mb-2 max-w-[48ch] text-body">
            {caseDateFields.length === 0
              ? "Add a date field to the Application Form before setting a window rule."
              : "Applicants see no track prompt for this service. Add a rule to route them when their event date falls outside the on-time window."}
          </p>
          <Button
            type="button"
            variant="raised"
            size="touch"
            disabled={caseDateFields.length === 0}
            onClick={enableTiming}
          >
            Add Window Rule
          </Button>
        </div>
      ) : (
        <FieldGroup className="gap-7">
          <div
            role="group"
            aria-label="Registration window rule"
            className="flex flex-col gap-7"
          >
            <div className={RULE_ROW}>
              <span className={LEAD_CLASS}>When</span>
              <div className="flex min-w-0 flex-col gap-3.5">
                <div className={CLAUSE}>
                  <Select
                    value={timing.triggerField}
                    onValueChange={(value) =>
                      value && updateTiming({ triggerField: value })
                    }
                  >
                    <SelectTrigger
                      id="timing-trigger-field"
                      aria-label="Trigger date"
                      data-inline-control=""
                      className={`${INLINE_CONTROL} max-w-full`}
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
                      aria-describedby="timing-mismatch-help"
                      data-inline-control=""
                      className={INLINE_CONTROL}
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
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Input
                      id="timing-window-days"
                      name="window_days"
                      type="number"
                      min={0}
                      max={3660}
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="On-time window length in days"
                      data-inline-control=""
                      className={`${INLINE_CONTROL} ${NO_SPINNER} w-[4.5rem] px-2 text-center tabular-nums`}
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
                  <span>on-time window</span>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-body">
                  <span>Days are counted in</span>
                  <Input
                    id="timing-timezone"
                    name="timing_timezone"
                    aria-label="Timezone"
                    aria-describedby={
                      zoneInvalid ? "timing-timezone-error" : undefined
                    }
                    data-inline-control="small"
                    className={`${INLINE_CONTROL} h-9 w-40 max-w-full`}
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
                  <span>time.</span>
                </div>
                {zoneInvalid ? (
                  <FieldError
                    id="timing-timezone-error"
                    errors={[
                      { message: "Enter a timezone name, such as Asia/Manila." },
                    ]}
                  />
                ) : null}
                <span id="timing-mismatch-help" className="sr-only">
                  Choose “outside” for an on-time service and “inside” for its
                  delayed counterpart.
                </span>
              </div>
            </div>

            <div className={RULE_ROW}>
              <span className={LEAD_CLASS}>Then</span>
              <div className="flex min-w-0 flex-col gap-3.5">
                <div className={CLAUSE}>
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
                      data-inline-control=""
                      className={`${INLINE_CONTROL} min-w-56 max-w-full`}
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
                <FieldDescription aria-live="polite" className="-mt-1">
                  {activeBehavior?.hint}
                </FieldDescription>

                {showTarget ? (
                  <Field>
                    <FieldLabel htmlFor="timing-target" data-compact="">
                      {routes ? "Switch applicants to" : "Alternate Service Track"}
                    </FieldLabel>
                    <Select
                      value={timing.targetServiceCode}
                      onValueChange={(value) =>
                        value && updateTiming({ targetServiceCode: value })
                      }
                    >
                      <SelectTrigger
                        id="timing-target"
                        size="touch"
                        className="w-full"
                        aria-describedby={
                          routesToSelf
                            ? "timing-target-self"
                            : !routes
                              ? "timing-target-required"
                              : undefined
                        }
                      >
                        <SelectValue>
                          {(value) =>
                            value
                              ? (targetOptions.find(
                                  (option) => option.value === value,
                                )?.label ?? String(value))
                              : "Choose a track"
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
                      <div
                        id="timing-target-self"
                        role="status"
                        className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-3 py-2.5 text-[13px] text-warning-strong ring-1 ring-warning-border ring-inset"
                      >
                        <TriangleAlert
                          aria-hidden="true"
                          className="mt-px size-4 shrink-0"
                        />
                        <p>
                          <span className="sr-only">
                            This rule would route to itself.{" "}
                          </span>
                          This is the service you’re editing. Pick a different
                          track so applicants have somewhere to go.
                        </p>
                      </div>
                    ) : null}
                  </Field>
                ) : null}
              </div>
            </div>
          </div>

          <Field
            orientation="horizontal"
            className="items-start gap-6 border-y py-5 sm:items-center"
          >
            <FieldContent className="min-w-0 max-w-[66ch]">
              <FieldLabel htmlFor="timing-require-document">
                Require the supporting document before the date check
              </FieldLabel>
              <FieldDescription id="timing-require-document-help">
                Applicants upload it first, then the date is checked.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="timing-require-document"
              size="touch"
              className="ml-auto shrink-0"
              aria-describedby="timing-require-document-help"
              checked={timing.requireDocumentFirst}
              onCheckedChange={(checked) =>
                updateTiming({ requireDocumentFirst: checked })
              }
            />
          </Field>

          <FieldSet className="gap-4">
            <div>
              <FieldLegend variant="label" className="mb-0 !text-base !font-semibold">
                What Applicants See
              </FieldLegend>
              <FieldDescription>
                Edit the message and watch it update.
              </FieldDescription>
            </div>
            <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <FieldGroup className="min-w-0 gap-5">
                <Field>
                  <FieldLabel htmlFor="timing-title" data-compact="">
                    Alert Title
                  </FieldLabel>
                  <Input
                    id="timing-title"
                    name="timing_title"
                    fieldSize="touch"
                    maxLength={160}
                    value={timing.title}
                    onChange={(event) =>
                      updateTiming({ title: event.target.value })
                    }
                    autoComplete="off"
                  />
                </Field>
                {/* Saving needs a label, so a blank one stays editable even where no button shows. */}
                {showsCta || !timing.ctaLabel.trim() ? (
                <Field>
                  <FieldLabel htmlFor="timing-cta" data-compact="">
                    Button Label
                  </FieldLabel>
                  <Input
                    id="timing-cta"
                    name="timing_cta"
                    fieldSize="touch"
                    maxLength={80}
                    value={timing.ctaLabel}
                    onChange={(event) =>
                      updateTiming({ ctaLabel: event.target.value })
                    }
                    autoComplete="off"
                  />
                </Field>
                ) : null}
                <Field>
                  <FieldLabel htmlFor="timing-description" data-compact="">
                    Alert Description
                  </FieldLabel>
                  <Textarea
                    id="timing-description"
                    name="timing_description"
                    rows={3}
                    maxLength={500}
                    fieldSize="touch"
                    value={timing.description}
                    onChange={(event) =>
                      updateTiming({ description: event.target.value })
                    }
                  />
                </Field>
              </FieldGroup>

              <div className="flex min-w-0 flex-col gap-3 self-start rounded-2xl bg-surface-subtle p-[18px] ring-1 ring-border ring-inset">
                <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                  Preview
                </span>
                {timing.behavior === "auto_route" ? (
                  <div className="flex items-start gap-3 rounded-[14px] bg-card p-4 text-[15px] text-body ring-1 ring-border ring-inset">
                    <Zap
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <p>
                      Applicants are sent to <b>{targetLabel}</b> as soon as they
                      pick the date, so they don’t see this message.
                    </p>
                  </div>
                ) : (
                  <div aria-label="Preview of the alert applicants see" role="group">
                    <EventTimingNotice
                      behavior={timing.behavior}
                      role="group"
                      title={timing.title.trim() || "Add an alert title"}
                      description={
                        timing.description.trim() || "Add a short description"
                      }
                      ctaLabel={timing.ctaLabel}
                    />
                  </div>
                )}
                <p className="text-[13px] text-muted-foreground">
                  {PREVIEW_CAPTIONS[timing.behavior]}
                </p>
              </div>
            </div>
          </FieldSet>
        </FieldGroup>
      )}
    </FieldSet>
  );
}
