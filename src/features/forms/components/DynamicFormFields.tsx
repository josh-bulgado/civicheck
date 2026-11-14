import { eventPlacePlaceholder, validateEventPlace } from "../event-place";
import { formatFieldLabel, isRegistryNumberField } from "~/features/forms/field-label";
import { isNameField, validateNameField } from "~/lib/person-name";
import { Fragment, type ReactNode } from "react";
import { addressDescendants } from "~/lib/requester-address";
import { AddressLocationField } from "./AddressLocationField";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Checkbox } from "~/components/ui/checkbox";
import { Phone } from "lucide-react";
import { DatePicker } from "~/components/ui/date-picker";
import { EstimatedDateField } from "./EstimatedDateField";
import { registrationEventDate, validateDateAnswer } from "../date-validation";
import { selectableFieldOptions, todayKeyInTimeZone } from "../form-template.utils";
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
  FORM_SECTION_CLASS,
  FORM_GROUP_CLASS,
  WIZARD_TEXTAREA_CLASS,
  WizardFieldError,
} from "./wizard-field";
import type {
  FormSectionDefinition,
  FormStep,
  FormTemplateDefinition,
} from "../form-template.types";
import { applicantCopy } from "../applicant-copy";

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
  readOnly = false,
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
  readOnly?: boolean;
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
        readOnly={readOnly}
        disabled={none}
        aria-invalid={invalid}
        className={cn(
          WIZARD_CONTROL_CLASS,
          none && "border-border-light bg-portal-panel",
        )}
      />
      <label className="-mt-2.5 flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] leading-none text-portal-ink-2">
        <Checkbox
          disabled={readOnly}
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
  | "pair-end"
  | "narrow-start"
  | "wide-end";

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
  "narrow-start": "sm:col-start-1 sm:col-span-2 sm:self-end",
  "wide-end": "sm:col-span-4 sm:self-end",
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
    const span: FieldSpan =
      run.length > 0 && run.length % 3 === 0 ? "third" : "half";
    for (const key of run) spans.set(key, span);
    run = [];
  };

  for (const field of fields) {
    if (field.key === fields.find((item) => ["father_first_name", "father_middle_name", "father_last_name"].includes(item.key))?.key) closeRun();
    const placement =
      field.type === "select" && isChoiceGroup(field.options ?? [])
        ? (choicePlacements.get(field.key) ?? "full")
        : null;
    if (placement) {
      closeRun();
      spans.set(field.key, placement === "full" ? "full" : placement);
    } else if (field.type === "textarea") {
      closeRun();
      spans.set(field.key, "full");
    } else if (field.visibleWhen && keys.has(field.visibleWhen.field)) {
      closeRun();
      spans.set(field.key, "follow-up");
    } else {
      run.push(field.key);
    }
    if (field.key === fields.filter((item) => ["father_first_name", "father_middle_name", "father_last_name"].includes(item.key)).at(-1)?.key) closeRun();
  }
  closeRun();
  for (const prefix of ["mother", "wife"]) {
    for (const part of ["first", "middle", "last"]) {
      const key = `${prefix}_${part}_name`;
      if (keys.has(key)) spans.set(key, "third");
    }
  }
  for (const key of ["father_last_name", "father_middle_name", "father_first_name"]) {
    if (keys.has(key)) spans.set(key, "third");
  }
  return spans;
}

export function DynamicFormFields<TFieldValues extends FieldValues>({
  definition,
  step,
  control,
  values,
  onDateChange,
  onFieldChange,
  showRequiredMarks = false,
  showSectionTitles = false,
  hideSectionTitles = false,
  sectionHeadingClassName,
  singleColumn = false,
  widePair,
  staffView = false,
  readOnlyKeys = [],
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
  onFieldChange?: (fieldKey: string, value: string) => void;
  /** Adds an asterisk to required labels; the caller owns the legend. */
  showRequiredMarks?: boolean;
  /**
   * Always titles each section. By default a step with a single section is left
   * untitled; callers that stack other content above it ask for the title so
   * the page reads as headed blocks.
   */
  showSectionTitles?: boolean;
  hideSectionTitles?: boolean;
  sectionHeadingClassName?: string;
  /** Stacks every field on its own row instead of pairing short inputs. */
  singleColumn?: boolean;
  widePair?: readonly [string, string];
  staffView?: boolean;
  readOnlyKeys?: readonly string[];
  /**
   * Content drawn under a section's heading, before its fields. The details step
   * uses it to place the person-name block (which has its own inputs) inside the
   * section that owns the `person_group` field, so sections can be reordered.
   */
  renderSectionLead?: (section: FormSectionDefinition) => ReactNode;
}) {
  const sections = definition.sections.filter(
    (section) => section.step === step,
  );

  return sections.map((section, sectionIndex) => {
    const fields = conditionMatches(section, values).map((field) => (
      field.type === "select" ? { ...field, options: selectableFieldOptions(field, values) } : field
    )).filter(
      (field) => field.type !== "person_group",
    );
    const lead = renderSectionLead?.(section) ?? null;
    if (!fields.length && !lead) return null;
    const choicePlacements = planChoiceLayout(fields);
    const spans = planFieldSpans(fields, choicePlacements);
    // Keep the record date and place together, with contact below the date.
    if (fields.find((field) => field.key === "event_date")?.labelByAnswer?.field === "record_type" &&
      fields.some((field) => field.key === "event_place") &&
      fields.some((field) => field.key === "contact_number")) {
      spans.set("event_date", "pair-start");
      spans.set("event_place", "pair-end");
      spans.set("contact_number", "pair-start");
    }
    // A section (or the whole call) can ask for one field per row; fields marked
    // `inline` still share a row, which is how a first/middle/last name sits on
    // one line.
    const stacked = singleColumn || section.singleColumn === true;
    if (stacked) {
      for (const field of fields)
        spans.set(field.key, field.inline ? "inline" : "full");
    }
    if (widePair) {
      spans.set(widePair[0], "narrow-start");
      spans.set(widePair[1], "wide-end");
    }
    const titled = !hideSectionTitles && (showSectionTitles || sections.length > 1);
    // Separate sections with a divider and space before the next fields.
    const setApart = sectionIndex > 0;

    return (
      <section
        key={section.key}
        className={cn(
          "flex flex-col gap-3",
          setApart &&
            "mt-6 border-t border-border-light pt-6",
          !setApart && step === "details" && sectionIndex > 0 && "pt-2",
        )}
      >
        {titled ? (
          <div className={cn("-mb-2 flex flex-col gap-0.5", sectionHeadingClassName)}>
            <h2
              className={FORM_SECTION_CLASS}
            >
              {applicantCopy(section.title)}
            </h2>
            {section.description ? (
              <p className="text-xs text-muted-foreground">
                {applicantCopy(section.description)}
              </p>
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
            <Fragment key={definitionField.key}>
              {definitionField.key === "father_name" && (
                (values.marital === "non-marital" && section.fields.some((field) => field.key === "requester_relationship_other")) ||
                (values.record_type === "birth" && definition.sections.some((item) => item.fields.some((field) => field.key === "entry_to_supplement")))
              ) ? (
                <div role="separator" className="col-span-full border-t border-border-light" />
              ) : null}
              {definitionField.key === "requester_relationship" &&
              !definitionField.options?.some((option) => option.value === "funeral_representative") &&
              section.fields.some((field) => field.key === "requester_relationship_other") ? (
                <div role="separator" className="col-span-full border-t border-border-light" />
              ) : null}
              {definitionField.key === "mother_first_name" ? (
                <h3 className={cn("col-span-full border-t border-border-light pt-5", FORM_GROUP_CLASS)}>Mother's Maiden Name</h3>
              ) : null}
              {definitionField.key === "wife_first_name" ? (
                <h3 className={cn("col-span-full border-t border-border-light pt-5", FORM_GROUP_CLASS)}>Wife's Maiden Name</h3>
              ) : null}
              {definitionField.key === fields.find((field) => ["father_first_name", "father_middle_name", "father_last_name"].includes(field.key))?.key ? (
                <h3 className={cn("col-span-full border-t border-border-light pt-5", FORM_GROUP_CLASS)}>Father's Name</h3>
              ) : null}
              {section.key === "details_requester" && definitionField.key === "requester_province" ? (
                <h3 className={cn("col-span-full border-t border-border-light pt-5", FORM_GROUP_CLASS)}>Address</h3>
              ) : null}
            <Controller
              key={definitionField.key}
              control={control}
              name={definitionField.key as Path<TFieldValues>}
              rules={{
                required: definitionField.required
                  ? definitionField.type === "select"
                    ? "Select an option."
                    : "Enter a value."
                  : false,
                validate: (value) => {
                  if (!value) return true;
                  if (definitionField.type === "select" && definitionField.options?.length &&
                    !definitionField.options.some((option) => option.value === value)) {
                    return "Select a valid option";
                  }
                  const placeValidation = validateEventPlace(definitionField, value);
                  if (placeValidation !== true) return placeValidation;
                  if (definitionField.noneLabel && value === NONE_ANSWER) return true;
                  if (isNameField(definitionField)) return validateNameField(definitionField, value);
                  if (definitionField.type === "date") {
                    return validateDateAnswer(definitionField, value, values, todayKeyInTimeZone());
                  }
                  if (
                    definitionField.type === "phone" &&
                    !/^9\d{9}$/.test(value)
                  ) {
                    return "Enter a valid 10-digit mobile number, e.g. 9171234567";
                  }
                  return true;
                },
                maxLength: {
                  value: definitionField.type === "textarea" ? 2_000 : 240,
                  message:
                    definitionField.type === "textarea"
                      ? "Use 2,000 characters or fewer."
                      : "Use 240 characters or fewer.",
                },
              }}
              render={({ field, fieldState }) => {
                const addressLevel = definitionField.philippineAddressLevel;
                const locationLevel = definitionField.countrySelect ? "country" : addressLevel;

                // Start a fresh dropdown when its province or city changes.
                let locationKey = definitionField.key;
                if (addressLevel === "city" || addressLevel === "barangay") {
                  locationKey += ":" + values.requester_province;
                }
                if (addressLevel === "barangay") {
                  locationKey += ":" + values.requester_city;
                }

                const placeholder = definitionField.key === "other_entry"
                  ? ({
                    birth: "e.g. Mother's maiden name, place of birth",
                    marriage: "e.g. Husband's name, wife's maiden name, place of marriage",
                    death: "e.g. Deceased person's name, place of death",
                  } as Record<string, string>)[values.record_type] ?? definitionField.placeholder
                  : eventPlacePlaceholder(definitionField, values.record_type);

                const selectedNotice =
                  definitionField.type === "select"
                    ? definitionField.options?.find(
                        (option) => option.value === field.value,
                      )?.notice
                    : undefined;
                const selectOptions = definitionField.key === "requester_relationship" && !definitionField.required
                  ? [{ value: "", label: "Leave blank" }, ...(definitionField.options ?? [])]
                  : definitionField.options ?? [];
                const common = (showError = fieldState.invalid) => (
                  <>
                    {!isRegistryNumberField(definitionField) &&
                    !["died_in_legazpi", "disposal_method", "embalmed", "death_registration_basis"].includes(definitionField.key) &&
                    applicantCopy(definitionField.helpText) ? (
                      <FieldDescription>
                        {applicantCopy(definitionField.helpText)}
                      </FieldDescription>
                    ) : null}
                    {selectedNotice ? (
                      <div aria-live="polite">
                        <NoticeAlert
                          variant={selectedNotice.variant}
                          title={selectedNotice.title}
                        >
                          {definitionField.key === "died_in_legazpi" ? null : selectedNotice.description}
                        </NoticeAlert>
                      </div>
                    ) : null}
                    {showError ? (
                      <WizardFieldError error={fieldState.error} />
                    ) : null}
                  </>
                );

                const options = (definitionField.options ?? []).map((option) => ({
                  ...option,
                  label: applicantCopy(option.label),
                }));
                const fieldLabel = applicantCopy(
                  ({ mother_first_name: "First name", mother_middle_name: "Middle name", mother_last_name: "Last name", wife_first_name: "First name", wife_middle_name: "Middle name", wife_last_name: "Last name" } as Record<string, string>)[definitionField.key]
                    ?? (definitionField.labelByAnswer
                      ? definitionField.labelByAnswer.labels[values[definitionField.labelByAnswer.field]]
                      : undefined)
                    ?? definitionField.label,
                );
                const legendLabel = (
                  <>
                    {formatFieldLabel(fieldLabel)}
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
                if (
                  definitionField.type === "select" &&
                  isChoiceGroup(options)
                ) {
                  const legendId = `dynamic-${definitionField.key}-legend`;
                  const placement =
                    choicePlacements.get(definitionField.key) ?? "full";
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
                        className={cn(
                          choiceLegendClass,
                          !stacked &&
                          ["has_marriage_agreement", "solemnized_in_legazpi"].includes(definitionField.key) &&
                            fields.some((item) => item.key === "has_marriage_agreement") &&
                            fields.some((item) => item.key === "solemnized_in_legazpi") &&
                            "sm:float-left sm:flex-1",
                        )}
                      >
                        {legendLabel}
                      </FieldLegend>
                      <ChoiceGroup
                        options={options.map((option) => {
                          if (definitionField.key !== "endorsement_type") return option;
                          const separator = option.label.indexOf(": ");
                          if (separator < 0) return option;
                          const description = option.label.slice(separator + 2);
                          return {
                            ...option,
                            label: option.label.slice(0, separator),
                            description: description.charAt(0).toUpperCase() + description.slice(1),
                          };
                        })}
                        className={definitionField.key === "endorsement_type"
                          ? "[&_[data-slot=field-label]]:justify-start [&_[data-slot=field]]:items-start! [&_[role=radio]]:mt-px! [&_[data-slot=field-content]]:gap-1.5 [&_[data-slot=field-content]>.font-medium]:font-semibold [&_[data-slot=field-content]>.text-xs]:text-sm [&_[data-slot=field-content]>.text-xs]:font-normal [&_[data-slot=field-content]>.text-xs]:leading-relaxed"
                          : undefined}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        idPrefix={`dynamic-${definitionField.key}`}
                        wide={placement === "full"}
                        invalid={fieldState.invalid}
                        labelledBy={legendId}
                      />
                      {common()}
                    </FieldSet>
                  );
                }

                return (
                  <Field
                    data-invalid={fieldState.invalid}
                    className={cn(
                      SPAN_CLASS[spans.get(definitionField.key) ?? "half"],
                      !stacked && ["reference_number", "marriage_date"].includes(definitionField.key) &&
                        fields.some((item) => item.key === "father_on_record") &&
                        fields.some((item) => item.key === "marriage_date") &&
                        "sm:self-end",
                      // The tiles above a free-text box sit tight against its
                      // label; a few extra pixels keep them apart.
                      stacked &&
                        definitionField.type === "textarea" &&
                        "mt-2 sm:mt-3",
                    )}
                  >
                    <FieldLabel
                      htmlFor={`dynamic-${definitionField.key}`}
                      id={`dynamic-${definitionField.key}-label`}
                      className={WIZARD_LABEL_CLASS}
                    >
                      {legendLabel}
                    </FieldLabel>

                    {locationLevel ? (
                      <AddressLocationField
                        key={locationKey}
                        level={locationLevel}
                        area={values.requester_province ?? ""}
                        city={values.requester_city ?? ""}
                        value={field.value ?? ""}
                        onChange={(value) => {
                          field.onChange(value);
                          if (value !== field.value && addressLevel) {
                            for (const key of addressDescendants(addressLevel)) {
                              onFieldChange?.(key, "");
                            }
                          }
                        }}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        id={`dynamic-${definitionField.key}`}
                        invalid={fieldState.invalid}
                      />
                    ) : definitionField.type === "textarea" ? (
                      <Textarea
                        {...field}
                        id={`dynamic-${definitionField.key}`}
                        rows={3}
                        maxLength={2_000}
                        placeholder={placeholder}
                        aria-invalid={fieldState.invalid}
                        className={WIZARD_TEXTAREA_CLASS}
                      />
                    ) : definitionField.type === "date" ? (
                      definitionField.allowEstimate ? (
                        <EstimatedDateField
                          staffView={staffView}
                          min={definitionField.key === "registered_late_when" ? registrationEventDate(values) : undefined}
                          id={`dynamic-${definitionField.key}`}
                          value={field.value ?? ""}
                          onChange={(value) => {
                            field.onChange(value);
                            onDateChange?.(definitionField.key, value);
                          }}
                          onBlur={field.onBlur}
                          invalid={fieldState.invalid}
                        />
                      ) : (
                        <DatePicker
                          shape="split"
                          id={`dynamic-${definitionField.key}`}
                          value={field.value ?? ""}
                          onValueChange={(value) => {
                            field.onChange(value);
                            onDateChange?.(definitionField.key, value);
                          }}
                          onBlur={field.onBlur}
                          max={
                            definitionField.dateDirection === "past"
                              ? todayKeyInTimeZone()
                              : undefined
                          }
                          min={
                            definitionField.key === "registered_late_when"
                              ? registrationEventDate(values)
                              : definitionField.dateDirection === "future"
                              ? todayKeyInTimeZone()
                              : undefined
                          }
                          // The label is right above, so without a placeholder of its
                          // own the picker says "Select a date" instead of repeating
                          // it: a long label ("Date of the event on the record") ran
                          // past the field and was cut off.
                          placeholder={definitionField.placeholder || undefined}
                          invalid={fieldState.invalid}
                          icon="calendar"
                          // The wizard's 56px height only reaches a Button. An Input
                          // or Select keeps its own 40px (their size selectors
                          // outrank it), so the picker takes that size too, or it
                          // stands taller than the fields beside it.
                          className={cn(WIZARD_CONTROL_CLASS, "h-10 px-3")}
                        />
                      )
                    ) : definitionField.type === "select" ? (
                      <Select
                        items={selectOptions}
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
                        <SelectContent className="service-form-options">
                          <SelectGroup>
                            {selectOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
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
                          placeholder={placeholder}
                          maxLength={10}
                          aria-invalid={fieldState.invalid}
                        />
                      </InputGroup>
                    ) : definitionField.noneLabel ? (
                      <TextWithNoneOption
                        field={field}
                        id={`dynamic-${definitionField.key}`}
                        placeholder={placeholder}
                        invalid={fieldState.invalid}
                        readOnly={readOnlyKeys.includes(definitionField.key)}
                        noneLabel={/(^|_)middle_name$/.test(definitionField.key)
                          ? "No middle name"
                          : definitionField.noneLabel}
                      />
                    ) : (
                      <Input
                        {...field}
                        id={`dynamic-${definitionField.key}`}
                        readOnly={readOnlyKeys.includes(definitionField.key)}
                        autoComplete="off"
                        placeholder={placeholder}
                        maxLength={240}
                        aria-invalid={fieldState.invalid}
                        className={WIZARD_CONTROL_CLASS}
                        fieldSize="touch"
                      />
                    )}
                    {common()}
                  </Field>
                );
              }}
            />
            </Fragment>
          ))}
        </FieldGroup>
      </section>
    );
  });
}
