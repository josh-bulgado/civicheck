import type { ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Checkbox } from "~/components/ui/checkbox";
import { Phone } from "lucide-react";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Field,
  FieldDescription,
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
import { RequiredMark } from "~/components/ui/required-mark";
import { Textarea } from "~/components/ui/textarea";
import { toDateKey } from "~/lib/date";
import { mobileDigits } from "~/lib/phone";
import { cn } from "~/lib/utils";
import {
  ChoiceGroup,
  choiceLegendClass,
  isChoiceGroup,
  planChoiceLayout,
} from "./ChoiceGroup";
import { NoticeAlert } from "./NoticeAlert";
import {
  WIZARD_CONTROL_CLASS,
  WIZARD_GROUP_CLASS,
  WIZARD_LABEL_CLASS,
  WIZARD_TEXTAREA_CLASS,
  WizardFieldError,
} from "./wizard-field";
import type {
  FormSectionDefinition,
  FormStep,
  FormTemplateDefinition,
} from "../form-template.types";

export type DynamicFieldValues = Record<string, string>;

/** What a ticked "I don't have one" box stores, so a required field counts as answered. */
export const NONE_ANSWER = "N/A";

/**
 * A text input with an "I don't have one" checkbox (the middle-name pattern from
 * the details step). Ticking it fills the input with "N/A" and switches it off,
 * so the question still counts as answered; unticking clears it and puts the
 * cursor back in it. The box reads as ticked whenever the stored answer is "N/A",
 * so it survives leaving and coming back to the step.
 */
function TextWithNoneOption({
  field,
  id,
  placeholder,
  invalid,
  noneLabel,
}: {
  field: {
    value: string | undefined;
    onChange: (value: string) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<HTMLInputElement>;
  };
  id: string;
  placeholder?: string;
  invalid: boolean;
  noneLabel: string;
}) {
  const none = field.value === NONE_ANSWER;
  return (
    <>
      <Input
        {...field}
        value={field.value ?? ""}
        onChange={(event) => field.onChange(event.target.value)}
        id={id}
        autoComplete="off"
        placeholder={placeholder}
        maxLength={240}
        disabled={none}
        aria-invalid={invalid}
        className={cn(WIZARD_CONTROL_CLASS, none && "border-border-light bg-portal-panel")}
      />
      <label className="-mt-2.5 flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] leading-none text-portal-ink-2">
        <Checkbox
          checked={none}
          onCheckedChange={(checked) => {
            if (checked === true) {
              field.onChange(NONE_ANSWER);
            } else {
              field.onChange("");
              requestAnimationFrame(() => document.getElementById(id)?.focus());
            }
          }}
          className="size-5.5 rounded-md border-[1.5px] border-[#b9c7de] dark:border-border-strong shadow-none [&_svg]:size-4"
        />
        {noneLabel}
      </label>
    </>
  );
}

function conditionMatches(
  section: FormSectionDefinition,
  values: DynamicFieldValues,
) {
  return section.fields.filter((field) => {
    if (!field.visibleWhen) return true;
    const current = values[field.visibleWhen.field] ?? "";
    return field.visibleWhen.operator === "equals"
      ? current === field.visibleWhen.value
      : current !== field.visibleWhen.value;
  });
}

/**
 * The fields a step is showing right now: `visibleWhen` rules applied, person
 * groups left out (they have their own inputs). Callers use it to ask which
 * required fields are still empty without re-implementing the visibility rule.
 */
export function visibleFieldsForStep(
  definition: FormTemplateDefinition,
  step: FormStep,
  values: DynamicFieldValues,
) {
  return definition.sections
    .filter((section) => section.step === step)
    .flatMap((section) => conditionMatches(section, values))
    .filter((field) => field.type !== "person_group");
}

type FieldSpan =
  | "full"
  | "half"
  | "third"
  | "inline"
  | "follow-up"
  | "pair-start"
  | "pair-end";

// The grid has six columns so a row can hold two fields (3 + 3) or three
// (2 + 2 + 2). Every field gets a span from the plan below; nothing is left to
// auto-placement, which is what used to strand a field beside an unrelated one.
const SPAN_CLASS: Record<FieldSpan, string> = {
  full: "sm:col-span-6",
  half: "sm:col-span-3",
  // Three short inputs share a row once there is room for all three.
  third: "sm:col-span-3 lg:col-span-2",
  // A field marked `inline` in a single-column step: up to three share a row.
  inline: "sm:col-span-2",
  // A follow-up (a field that only appears for one answer of an earlier
  // question) takes its own row directly under that question, at half width.
  "follow-up": "sm:col-span-6 sm:max-w-[calc(50%-0.5rem)]",
  // A pair always starts its own row, even after an odd number of half fields.
  "pair-start": "sm:col-start-1 sm:col-span-3",
  "pair-end": "sm:col-span-3",
};

function planFieldSpans(
  fields: readonly FormSectionDefinition["fields"][number][],
  choicePlacements: ReturnType<typeof planChoiceLayout>,
) {
  const keys = new Set(fields.map((field) => field.key));
  const spans = new Map<string, FieldSpan>();
  let run: string[] = [];

  // Consecutive plain inputs form a run; a run of exactly three (or six) fills
  // rows of three, any other length pairs up two by two.
  const closeRun = () => {
    const span: FieldSpan = run.length > 0 && run.length % 3 === 0 ? "third" : "half";
    for (const key of run) spans.set(key, span);
    run = [];
  };

  for (const field of fields) {
    const placement =
      field.type === "select" && isChoiceGroup(field.options ?? [])
        ? (choicePlacements.get(field.key) ?? "full")
        : null;
    if (placement) {
      closeRun();
      spans.set(
        field.key,
        placement === "full" ? "full" : placement,
      );
    } else if (field.type === "textarea") {
      closeRun();
      spans.set(field.key, "full");
    } else if (field.visibleWhen && keys.has(field.visibleWhen.field)) {
      closeRun();
      spans.set(field.key, "follow-up");
    } else {
      run.push(field.key);
    }
  }
  closeRun();
  return spans;
}

export function DynamicFormFields<TFieldValues extends FieldValues>({
  definition,
  step,
  control,
  values,
  onDateChange,
  showRequiredMarks = false,
  showSectionTitles = false,
  singleColumn = false,
  renderSectionLead,
}: {
  definition: FormTemplateDefinition;
  step: FormStep;
  /**
   * The calling form's own control. Field keys come from the published template
   * at runtime, so they cannot be checked against `TFieldValues` here.
   */
  control: Control<TFieldValues>;
  values: DynamicFieldValues;
  onDateChange?: (fieldKey: string, value: string) => void;
  /** Adds an asterisk to required labels; the caller owns the legend. */
  showRequiredMarks?: boolean;
  /**
   * Always titles each section. By default a step with a single section is left
   * untitled; callers that stack other content above it ask for the title so
   * the page reads as headed blocks.
   */
  showSectionTitles?: boolean;
  /** Stacks every field on its own row instead of pairing short inputs. */
  singleColumn?: boolean;
  /**
   * Content drawn under a section's heading, before its fields. The details step
   * uses it to place the person-name block (which has its own inputs) inside the
   * section that owns the `person_group` field, so sections can be reordered.
   */
  renderSectionLead?: (section: FormSectionDefinition) => ReactNode;
}) {
  const sections = definition.sections.filter((section) => section.step === step);

  return sections.map((section, sectionIndex) => {
    const fields = conditionMatches(section, values).filter(
      (field) => field.type !== "person_group",
    );
    const lead = renderSectionLead?.(section) ?? null;
    if (!fields.length && !lead) return null;
    const choicePlacements = planChoiceLayout(fields);
    const spans = planFieldSpans(fields, choicePlacements);
    // A section (or the whole call) can ask for one field per row; fields marked
    // `inline` still share a row, which is how a first/middle/last name sits on
    // one line.
    const stacked = singleColumn || section.singleColumn === true;
    if (stacked) {
      for (const field of fields) spans.set(field.key, field.inline ? "inline" : "full");
    }
    const titled = showSectionTitles || sections.length > 1;
    // Stacked sections after the first are set apart with a rule and generous
    // room, so the applicant sees where one block ends and the next begins.
    const setApart = stacked && sectionIndex > 0;

    return (
      <section
        key={section.key}
        className={cn(
          "flex flex-col gap-3",
          setApart && "mt-8 border-t border-border-light pt-12 sm:mt-10 sm:pt-14",
        )}
      >
        {titled ? (
          <div className="-mb-2 flex flex-col gap-0.5">
            <h2
              className={
                showSectionTitles
                  ? "text-pretty text-lg leading-tight font-bold text-foreground"
                  : "text-sm font-semibold text-foreground"
              }
            >
              {section.title}
            </h2>
            {section.description ? (
              <p className="text-xs text-muted-foreground">{section.description}</p>
            ) : null}
          </div>
        ) : null}

        {lead}

        {/* The section's own gap is smaller than the gap between fields, so after
            a lead block (the owner's name boxes) add the difference to match. */}
        <FieldGroup
          className={cn(
            "grid grid-cols-1 gap-5 sm:grid-cols-6",
            lead && fields.length > 0 && "mt-2",
          )}
        >
          {fields.map((definitionField) => (
            <Controller
              key={definitionField.key}
              control={control}
              name={definitionField.key as Path<TFieldValues>}
              rules={{
                required: definitionField.required
                  ? `${definitionField.label} is required`
                  : false,
                validate: (value) => {
                  if (!value) return true;
                  if (definitionField.type === "phone" && !/^9\d{9}$/.test(value)) {
                    return "Enter a valid 10-digit mobile number, e.g. 9171234567";
                  }
                  return true;
                },
                maxLength: {
                  value: definitionField.type === "textarea" ? 2_000 : 240,
                  message: `${definitionField.label} is too long`,
                },
              }}
              render={({ field, fieldState }) => {
                const selectedNotice =
                  definitionField.type === "select"
                    ? definitionField.options?.find(
                        (option) => option.value === field.value,
                      )?.notice
                    : undefined;
                const common = (
                  <>
                    {definitionField.helpText ? (
                      <FieldDescription>{definitionField.helpText}</FieldDescription>
                    ) : null}
                    {selectedNotice ? (
                      <div aria-live="polite">
                        <NoticeAlert
                          variant={selectedNotice.variant}
                          title={selectedNotice.title}
                        >
                          {selectedNotice.description}
                        </NoticeAlert>
                      </div>
                    ) : null}
                    {fieldState.invalid ? (
                      <WizardFieldError error={fieldState.error} />
                    ) : null}
                  </>
                );

                const options = definitionField.options ?? [];
                const legendLabel = (
                  <>
                    {definitionField.label}
                    {!definitionField.required ? " (optional)" : ""}
                    {showRequiredMarks && definitionField.required ? (
                      <>
                        {" "}
                        <RequiredMark />
                      </>
                    ) : null}
                  </>
                );

                // Short pick-one lists show every choice as tiles, matching the
                // service-routing questions; long lists keep the dropdown.
                if (definitionField.type === "select" && isChoiceGroup(options)) {
                  const legendId = `dynamic-${definitionField.key}-legend`;
                  const placement = choicePlacements.get(definitionField.key) ?? "full";
                  return (
                    <FieldSet
                      data-invalid={fieldState.invalid}
                      className={cn(
                        "gap-3",
                        SPAN_CLASS[spans.get(definitionField.key) ?? "full"],
                      )}
                    >
                      <FieldLegend
                        variant="label"
                        id={legendId}
                        className={choiceLegendClass}
                      >
                        {legendLabel}
                      </FieldLegend>
                      <ChoiceGroup
                        options={options}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        idPrefix={`dynamic-${definitionField.key}`}
                        wide={placement === "full"}
                        invalid={fieldState.invalid}
                        labelledBy={legendId}
                      />
                      {common}
                    </FieldSet>
                  );
                }

                return (
                  <Field
                    data-invalid={fieldState.invalid}
                    className={cn(
                      SPAN_CLASS[spans.get(definitionField.key) ?? "half"],
                      // The tiles above a free-text box sit tight against its
                      // label; a few extra pixels keep them apart.
                      stacked && definitionField.type === "textarea" && "mt-2 sm:mt-3",
                    )}
                  >
                    <FieldLabel
                      htmlFor={`dynamic-${definitionField.key}`}
                      className={WIZARD_LABEL_CLASS}
                    >
                      {legendLabel}
                    </FieldLabel>

                    {definitionField.type === "textarea" ? (
                      <Textarea
                        {...field}
                        id={`dynamic-${definitionField.key}`}
                        rows={3}
                        maxLength={2_000}
                        placeholder={definitionField.placeholder}
                        aria-invalid={fieldState.invalid}
                        className={WIZARD_TEXTAREA_CLASS}
                      />
                    ) : definitionField.type === "date" ? (
                      <DatePicker
                        id={`dynamic-${definitionField.key}`}
                        value={field.value ?? ""}
                        onValueChange={(value) => {
                          field.onChange(value);
                          onDateChange?.(definitionField.key, value);
                        }}
                        onBlur={field.onBlur}
                        max={
                          definitionField.dateDirection === "past" ? toDateKey() : undefined
                        }
                        min={
                          definitionField.dateDirection === "future" ? toDateKey() : undefined
                        }
                        placeholder={
                          definitionField.placeholder ??
                          `Select ${definitionField.label.toLowerCase()}`
                        }
                        invalid={fieldState.invalid}
                        icon="calendar"
                        className={WIZARD_CONTROL_CLASS}
                      />
                    ) : definitionField.type === "select" ? (
                      <Select
                        items={definitionField.options ?? []}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id={`dynamic-${definitionField.key}`}
                          className={cn("w-full", WIZARD_CONTROL_CLASS)}
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Select one" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {(definitionField.options ?? []).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : definitionField.type === "phone" ? (
                      <InputGroup className={WIZARD_GROUP_CLASS}>
                        <InputGroupAddon>
                          <Phone aria-hidden="true" />
                          <InputGroupText>+63</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          // Letters and symbols never reach the field, typed
                          // or pasted.
                          onChange={(event) =>
                            field.onChange(mobileDigits(event.target.value))
                          }
                          id={`dynamic-${definitionField.key}`}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder={definitionField.placeholder}
                          maxLength={10}
                          aria-invalid={fieldState.invalid}
                        />
                      </InputGroup>
                    ) : definitionField.noneLabel ? (
                      <TextWithNoneOption
                        field={field}
                        id={`dynamic-${definitionField.key}`}
                        placeholder={definitionField.placeholder}
                        invalid={fieldState.invalid}
                        noneLabel={definitionField.noneLabel}
                      />
                    ) : (
                      <Input
                        {...field}
                        id={`dynamic-${definitionField.key}`}
                        autoComplete="off"
                        placeholder={definitionField.placeholder}
                        maxLength={240}
                        aria-invalid={fieldState.invalid}
                        className={WIZARD_CONTROL_CLASS}
                      />
                    )}
                    {common}
                  </Field>
                );
              }}
            />
          ))}
        </FieldGroup>
      </section>
    );
  });
}
