import { Controller, type Control } from "react-hook-form";
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

type FieldSpan = "full" | "half" | "third" | "follow-up" | "pair-start" | "pair-end";

// The grid has six columns so a row can hold two fields (3 + 3) or three
// (2 + 2 + 2). Every field gets a span from the plan below; nothing is left to
// auto-placement, which is what used to strand a field beside an unrelated one.
const SPAN_CLASS: Record<FieldSpan, string> = {
  full: "sm:col-span-6",
  half: "sm:col-span-3",
  // Three short inputs share a row once there is room for all three.
  third: "sm:col-span-3 lg:col-span-2",
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

export function DynamicFormFields({
  definition,
  step,
  control,
  values,
  onDateChange,
  showRequiredMarks = false,
  showSectionTitles = false,
}: {
  definition: FormTemplateDefinition;
  step: FormStep;
  control: Control<any>;
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
}) {
  const sections = definition.sections.filter((section) => section.step === step);

  return sections.map((section) => {
    const fields = conditionMatches(section, values).filter(
      (field) => field.type !== "person_group",
    );
    if (!fields.length) return null;
    const choicePlacements = planChoiceLayout(fields);
    const spans = planFieldSpans(fields, choicePlacements);
    const titled = showSectionTitles || sections.length > 1;

    return (
      <section key={section.key} className="flex flex-col gap-3">
        {titled ? (
          <div className="flex flex-col gap-1">
            <h2
              className={
                showSectionTitles
                  ? "text-pretty text-lg font-bold text-foreground"
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

        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          {fields.map((definitionField) => (
            <Controller
              key={definitionField.key}
              control={control}
              name={definitionField.key}
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
                    className={SPAN_CLASS[spans.get(definitionField.key) ?? "half"]}
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
                      <InputGroup>
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
