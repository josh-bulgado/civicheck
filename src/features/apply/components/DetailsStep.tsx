import { useEffect, useId, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RequiredMark } from "~/components/ui/required-mark";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import {
  DynamicFormFields,
  visibleFieldsForStep,
  type DynamicFieldValues,
} from "~/features/forms/components/DynamicFormFields";
import {
  WIZARD_CONTROL_CLASS,
  WIZARD_LABEL_CLASS,
  WizardFieldError,
} from "~/features/forms/components/wizard-field";
import {
  canonicalizeTemplateAnswers,
  fieldsForStep,
} from "~/features/forms/form-template.utils";
import { isRequirementApplicable } from "~/features/services/service-utils";
import type { ServiceDetail } from "~/features/services/services.queries";
import {
  impliedSex,
  NO_SUFFIX,
  reconcileSubjects,
  subjectsMatchRoles,
  SUFFIXES,
} from "~/lib/subject-fields";
import { cn } from "~/lib/utils";

type DetailsSubject = {
  role: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  sex: string;
  noMiddleName?: boolean;
};

type DetailsValues = Record<string, string | DetailsSubject[]> & {
  subjects: DetailsSubject[];
};

// No "unspecified" value is accepted by the schema — this sentinel only
// gives the Select a real item to resolve while nothing has been chosen yet,
// the same trick used for NO_SUFFIX.
const NO_SEX = "unspecified";

const SEXES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const SEX_ITEMS = [{ value: NO_SEX, label: "Select sex" }, ...SEXES];

/** Which of the optional inputs a subject shows, on top of the three names. */
function subjectFieldVisibility(role: string, sex: string | undefined) {
  const implied = impliedSex(role);
  return {
    // Generational suffixes (Jr., Sr., III...) are a male naming convention —
    // don't ask for one on a role that's implied to be a woman, or once the
    // applicant has picked "Female" for a role (like Child) where sex isn't
    // implied and is chosen instead.
    showSuffix: (implied ?? sex) !== "female",
    showSex: implied === null,
  };
}

/**
 * A party's heading names the person once, so the inputs under it can keep
 * plain labels ("First name") instead of repeating "Mother's …" on every row.
 * The group is named for assistive tech, which announces the role on entry.
 */
function PartySection({ role, children }: { role: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-xl leading-[normal] font-bold text-foreground">
        {role}
      </h2>
      {children}
    </div>
  );
}

/**
 * Middle name, with its "I don't have one" box. Ticking it clears the input and
 * switches it off (so it can neither be required nor validated); unticking
 * switches it back on and puts the cursor in it. The choice is part of the
 * subject, so it is saved with the draft and survives a reload.
 */
function MiddleNameField({
  control,
  setValue,
  index,
}: {
  control: Control<DetailsValues>;
  setValue: UseFormSetValue<DetailsValues>;
  index: number;
}) {
  const inputId = `subject-${index}-middleName`;
  const none = useWatch({ control, name: `subjects.${index}.noMiddleName` }) === true;

  return (
    <Field>
      <FieldLabel htmlFor={inputId} className={WIZARD_LABEL_CLASS}>
        Middle name
      </FieldLabel>
      <Controller
        control={control}
        name={`subjects.${index}.middleName`}
        render={({ field }) => (
          <Input
            id={inputId}
            placeholder={none ? "No middle name" : "Santos"}
            maxLength={120}
            autoComplete="off"
            className={cn(WIZARD_CONTROL_CLASS, none && "border-border-light bg-portal-panel")}
            {...field}
            disabled={none}
          />
        )}
      />
      <Controller
        control={control}
        name={`subjects.${index}.noMiddleName`}
        render={({ field }) => (
          // The whole row is the target, 44px tall for a thumb.
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] text-portal-ink-2">
            <Checkbox
              checked={field.value === true}
              onCheckedChange={(checked) => {
                const next = checked === true;
                field.onChange(next);
                if (next) {
                  setValue(`subjects.${index}.middleName`, "");
                } else {
                  // After the input is enabled again.
                  requestAnimationFrame(() => document.getElementById(inputId)?.focus());
                }
              }}
              className="size-5.5 rounded-md border-[1.5px] border-dashed-border shadow-none [&_svg]:size-4"
            />
            I don&rsquo;t have a middle name
          </label>
        )}
      />
    </Field>
  );
}

/**
 * The name/suffix/sex inputs for one subject. The three name parts share a row
 * from `md` up, with suffix and sex wrapping beneath, so every party's inputs
 * sit on the same columns and an unequal field count leaves nothing stranded.
 */
function SubjectFieldGrid({
  control,
  setValue,
  index,
  role,
}: {
  control: Control<DetailsValues>;
  setValue: UseFormSetValue<DetailsValues>;
  index: number;
  role: string;
}) {
  const watchedSex = useWatch({ control, name: `subjects.${index}.sex` });
  const { showSuffix, showSex } = subjectFieldVisibility(role, watchedSex);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-6 sm:*:col-span-3 md:*:col-span-2">
      <Controller
        control={control}
        name={`subjects.${index}.firstName`}
        rules={{ required: "First name is required" }}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`subject-${index}-firstName`} className={WIZARD_LABEL_CLASS}>First name <RequiredMark /></FieldLabel>
            <Input
              id={`subject-${index}-firstName`}
              placeholder="Juan"
              maxLength={120}
              autoComplete="off"
              aria-invalid={fieldState.invalid}
              className={WIZARD_CONTROL_CLASS}
              {...field}
            />
            {fieldState.invalid && <WizardFieldError error={fieldState.error} />}
          </Field>
        )}
      />
      <MiddleNameField control={control} setValue={setValue} index={index} />
      <Controller
        control={control}
        name={`subjects.${index}.lastName`}
        rules={{ required: "Last name is required" }}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`subject-${index}-lastName`} className={WIZARD_LABEL_CLASS}>Last name <RequiredMark /></FieldLabel>
            <Input
              id={`subject-${index}-lastName`}
              placeholder="Dela Cruz"
              maxLength={120}
              autoComplete="off"
              aria-invalid={fieldState.invalid}
              className={WIZARD_CONTROL_CLASS}
              {...field}
            />
            {fieldState.invalid && <WizardFieldError error={fieldState.error} />}
          </Field>
        )}
      />
      {showSuffix && (
        <Controller
          control={control}
          name={`subjects.${index}.suffix`}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={`subject-${index}-suffix`} className={WIZARD_LABEL_CLASS}>Suffix</FieldLabel>
              <Select
                items={SUFFIXES}
                value={field.value || NO_SUFFIX}
                onValueChange={(value) =>
                  field.onChange(value === NO_SUFFIX ? "" : value)
                }
              >
                <SelectTrigger
                  id={`subject-${index}-suffix`}
                  className={cn("w-full", WIZARD_CONTROL_CLASS)}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SUFFIXES.map((suffix) => (
                      <SelectItem key={suffix.label} value={suffix.value}>
                        {suffix.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      )}
      {showSex && (
        <Controller
          control={control}
          name={`subjects.${index}.sex`}
          rules={{ required: "Select the sex on record" }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`subject-${index}-sex`} className={WIZARD_LABEL_CLASS}>Sex <RequiredMark /></FieldLabel>
              <Select<"male" | "female" | typeof NO_SEX>
                items={SEX_ITEMS}
                value={(field.value as "male" | "female" | "") || NO_SEX}
                onValueChange={(value) => {
                  const next = value === NO_SEX ? "" : value;
                  field.onChange(next);
                  // Suffix disappears the moment this role is female — clear
                  // it right here instead of letting a stray value ride
                  // along in `form_data` unseen.
                  if (next === "female") {
                    setValue(`subjects.${index}.suffix`, "");
                  }
                }}
              >
                <SelectTrigger
                  id={`subject-${index}-sex`}
                  className={cn("w-full", WIZARD_CONTROL_CLASS)}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SEX_ITEMS.map((sex) => (
                      <SelectItem key={sex.value} value={sex.value}>
                        {sex.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <WizardFieldError error={fieldState.error} />}
            </Field>
          )}
        />
      )}
    </div>
  );
}

interface DetailsStepProps {
  serviceCode: string;
  requirements: ServiceDetail["requirements"];
  services: ServiceDetail["services"];
}

export function DetailsStep({ serviceCode, requirements, services }: DetailsStepProps) {
  const navigate = useNavigate();
  const { draft, update, hydrated } = useApplyDraft(serviceCode);
  const selectedService =
    services.find((s) => s.service_code === draft.selectedServiceCode) ?? services[0];
  const definition = selectedService.form_template!.definition;
  const detailsFields = fieldsForStep(definition, "details");
  const personGroupField = detailsFields.find((field) => field.type === "person_group");
  const hasPersonGroup = Boolean(personGroupField);
  const roles = selectedService?.party_roles?.length
    ? selectedService.party_roles
    : ["Subject"];

  // Most services ask about one person; Marriage License asks about two. Keep
  // `draft.subjects` in sync with whichever service is selected, preserving
  // anything already typed when the count/roles match.
  useEffect(() => {
    if (!hydrated || !hasPersonGroup) return;
    if (subjectsMatchRoles(draft.subjects, roles)) return;
    update((prev) => ({ subjects: reconcileSubjects(prev.subjects, roles) }));
    // `roles` is a new array each render (derived from loader data), so key
    // the effect on its contents instead of its reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasPersonGroup, roles.join("|"), draft.subjects, update]);

  const detailAnswers = Object.fromEntries(
    detailsFields
      .filter((field) => field.type !== "person_group")
      .map((field) => [
        field.key,
        typeof draft.answers[field.key] === "string" ? draft.answers[field.key] : "",
      ]),
  );

  const form = useForm<DetailsValues>({
    mode: "onBlur",
    shouldUnregister: true,
    values: {
      ...detailAnswers,
      subjects: hasPersonGroup
        ? (reconcileSubjects(draft.subjects, roles) as DetailsValues["subjects"])
        : [],
    },
  });

  const subjectFields = useFieldArray({ control: form.control, name: "subjects" });
  const showRoleLabels = hasPersonGroup && subjectFields.fields.length > 1;

  // Every starred input is filled in — the same set the form validates on
  // submit: each person's first name, last name and (where the role doesn't
  // imply it) sex, plus every visible required template field. The Next button
  // reads this to show when the step is ready.
  const watchedValues = form.watch();
  // The role comes from the field array, not the watched values: `role` has no
  // input of its own, so `shouldUnregister` drops it from the watched rows.
  const subjectsReady =
    !hasPersonGroup ||
    subjectFields.fields.every((field, index) => {
      const subject = watchedValues.subjects?.[index];
      return Boolean(
        subject?.firstName?.trim() &&
          subject.lastName?.trim() &&
          (impliedSex(field.role) !== null || subject.sex),
      );
    });
  const hasRequiredAnswers =
    subjectsReady &&
    visibleFieldsForStep(
      definition,
      "details",
      watchedValues as unknown as DynamicFieldValues,
    ).every((field) => {
      const value = watchedValues[field.key];
      return !field.required || (typeof value === "string" && value.trim() !== "");
    });

  function onSubmit(values: DetailsValues) {
    // Hidden suffix/sex controls are unregistered by React Hook Form. Convert
    // the submitted rows back to complete SubjectFields objects before saving
    // them in either `subjects` location in the draft.
    const subjects = reconcileSubjects(values.subjects, roles);
    const dynamicValues = Object.fromEntries(
      detailsFields
        .filter((field) => field.type !== "person_group")
        .map((field) => [
          field.key,
          typeof values[field.key] === "string" ? values[field.key] : "",
        ]),
    );
    update((previous) => {
      const answers = {
        ...previous.answers,
        ...dynamicValues,
        ...(personGroupField ? { [personGroupField.key]: subjects } : {}),
      };
      const answerBag = canonicalizeTemplateAnswers(definition, {
        ...answers,
        ...previous.caseSelectorAnswers,
      });
      const visibleRequirementIds = new Set(
        requirements
          .filter((requirement) =>
            isRequirementApplicable(
              requirement,
              previous.selectedServiceCode,
              answerBag,
            ),
          )
          .map((requirement) => requirement.id),
      );
      return {
        subjects,
        contactNumber:
          typeof values.contact_number === "string"
            ? values.contact_number
            : "",
        answers,
        documents: previous.documents.filter((document) =>
          visibleRequirementIds.has(document.requirementId),
        ),
      };
    });
    navigate({ to: "/apply/$serviceCode/documents", params: { serviceCode } });
  }

  return (
    <WizardShell
      step={2}
      title="Who is this document for?"
      description={
        showRoleLabels
          ? "Enter each party's full name exactly as it should appear on the civil registry record."
          : "Enter the full name of the person named on the civil registry record, exactly as it should appear."
      }
    >
      <div className="flex flex-col gap-6">
        {hasPersonGroup && showRoleLabels ? (
          // Each party is its own headed section, stacked, so its name parts
          // can run across the card instead of sharing narrow columns.
          <div className="flex flex-col gap-7.5">
            {subjectFields.fields.map((subjectField, index) => (
              <PartySection key={subjectField.id} role={subjectField.role}>
                <SubjectFieldGrid
                  control={form.control}
                  setValue={form.setValue}
                  index={index}
                  role={subjectField.role}
                />
              </PartySection>
            ))}
          </div>
        ) : hasPersonGroup ? (
          subjectFields.fields.map((subjectField, index) => (
            <FieldGroup key={subjectField.id}>
              <SubjectFieldGrid
                control={form.control}
                setValue={form.setValue}
                index={index}
                role={subjectField.role}
              />
            </FieldGroup>
          ))
        ) : null}

        <DynamicFormFields
          definition={definition}
          step="details"
          showRequiredMarks
          control={form.control}
          values={watchedValues as unknown as DynamicFieldValues}
        />

        <WizardFooterActions
          onBack={() =>
            navigate({ to: "/apply/$serviceCode/case", params: { serviceCode } })
          }
          onContinue={form.handleSubmit(onSubmit)}
          continueLabel="Next"
          continueReady={hasRequiredAnswers}
        />
      </div>
    </WizardShell>
  );
}
