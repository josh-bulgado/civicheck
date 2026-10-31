import { useEffect, useId, useRef, type ReactNode } from "react";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
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
  NONE_ANSWER,
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
  required = false,
}: {
  control: Control<DetailsValues>;
  setValue: UseFormSetValue<DetailsValues>;
  index: number;
  /** Starred: filled in, or the "I don't have one" box ticked. */
  required?: boolean;
}) {
  const inputId = `subject-${index}-middleName`;
  const none = useWatch({ control, name: `subjects.${index}.noMiddleName` }) === true;

  return (
    <Field>
      <FieldLabel htmlFor={inputId} className={WIZARD_LABEL_CLASS}>
        Middle Name {required ? <RequiredMark /> : null}
      </FieldLabel>
      <Controller
        control={control}
        name={`subjects.${index}.middleName`}
        rules={{
          // Read the box from the form values, not from this render: ticking it
          // re-runs this check, and it must see the box as ticked.
          validate: (value, formValues) =>
            !required ||
            formValues.subjects?.[index]?.noMiddleName === true ||
            (value ?? "").trim() !== "" ||
            "Middle name is required",
        }}
        render={({ field, fieldState }) => (
          <>
            <Input
              id={inputId}
              placeholder="Santos"
              maxLength={120}
              autoComplete="off"
              aria-invalid={fieldState.invalid}
              className={cn(WIZARD_CONTROL_CLASS, none && "border-border-light bg-portal-panel")}
              {...field}
              // A ticked box shows "N/A" (the saved name stays blank).
              value={none ? "N/A" : (field.value ?? "")}
              disabled={none}
            />
            {fieldState.invalid && <WizardFieldError error={fieldState.error} />}
          </>
        )}
      />
      <Controller
        control={control}
        name={`subjects.${index}.noMiddleName`}
        render={({ field }) => (
          // The whole row is the target, 44px tall for a thumb. The negative
          // margin pulls the box up to the input without shrinking that target.
          <label className="-mt-2.5 flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] leading-none text-portal-ink-2">
            <Checkbox
              checked={field.value === true}
              onCheckedChange={(checked) => {
                const next = checked === true;
                field.onChange(next);
                if (next) {
                  // Re-check the box now, so an earlier "required" error clears.
                  setValue(`subjects.${index}.middleName`, "", { shouldValidate: true });
                } else {
                  // After the input is enabled again.
                  requestAnimationFrame(() => document.getElementById(inputId)?.focus());
                }
              }}
              className="size-5.5 rounded-md border-[1.5px] border-[#b9c7de] dark:border-border-strong shadow-none [&_svg]:size-4"
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
  husband = false,
  control,
  setValue,
  index,
  role,
  requireMiddleName = false,
}: {
  control: Control<DetailsValues>;
  setValue: UseFormSetValue<DetailsValues>;
  index: number;
  role: string;
  husband?: boolean;
  requireMiddleName?: boolean;
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
            <FieldLabel htmlFor={`subject-${index}-firstName`} className={WIZARD_LABEL_CLASS}>First Name <RequiredMark /></FieldLabel>
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
      <MiddleNameField
        control={control}
        setValue={setValue}
        index={index}
        required={requireMiddleName}
      />
      <Controller
        control={control}
        name={`subjects.${index}.lastName`}
        rules={{ required: "Last name is required" }}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`subject-${index}-lastName`} className={WIZARD_LABEL_CLASS}>Last Name <RequiredMark /></FieldLabel>
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
      {showSex && !husband && (
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
  const { user } = useRouteContext({ from: "/_authed" });
  const { draft, update, hydrated } = useApplyDraft(serviceCode);
  const selectedService =
    services.find((s) => s.service_code === draft.selectedServiceCode) ?? services[0];
  const definition = selectedService.form_template!.definition;
  const detailsFields = fieldsForStep(definition, "details");
  const personGroupField = detailsFields.find((field) => field.type === "person_group");
  const hasPersonGroup = Boolean(personGroupField);
  const isEmailMarriage = selectedService.service_code === "EMAIL_INQUIRY" && draft.answers.record_type === "marriage";
  const requireMiddleName = personGroupField?.requireMiddleName === true;
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

  // The owner's block can sit under its own heading after other sections (CTC
  // asks about the requester first). Then the name inputs are drawn inside that
  // section, and the page is headed for both people.
  const detailSections = definition.sections.filter((section) => section.step === "details");
  const personSection = detailSections.find((section) =>
    section.fields.some((field) => field.type === "person_group"),
  );
  const ownerBlockInSection =
    Boolean(personSection) && detailSections.indexOf(personSection!) > 0;

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

  const requesterPrefilled = useRef(false);
  useEffect(() => {
    if (!hydrated || !user || requesterPrefilled.current) return;
    // The requester is the signed-in applicant, even when the record belongs to someone else.
    if (selectedService.service_code !== "EMAIL_INQUIRY") return;
    requesterPrefilled.current = true;
    const current = form.getValues();
    // Preserve saved names and anything already typed, including a married name.
    if (current.requester_first_name || current.requester_middle_name || current.requester_last_name) return;
    // The form's reactive values come from the draft. Persist the prefill there
    // so draft hydration or subject reconciliation cannot reset it to blanks.
    update((previous) => {
      if (previous.answers.requester_first_name || previous.answers.requester_middle_name || previous.answers.requester_last_name) return {};
      return {
        answers: {
          ...previous.answers,
          requester_first_name: user.firstName,
          requester_middle_name: user.hasNoMiddleName ? NONE_ANSWER : user.middleName,
          requester_last_name: user.lastName,
        },
      };
    });
  }, [hydrated, user, selectedService.service_code, form, update]);

  const subjectFields = useFieldArray({ control: form.control, name: "subjects" });
  const showRoleLabels = hasPersonGroup && subjectFields.fields.length > 1;

  // Every starred input is filled in — the same set the form validates on
  // submit: each person's first name, last name and (where the role doesn't
  // imply it) sex, plus every visible required template field. The Next button
  // reads this to show when the step is ready.
  const watchedValues = form.watch();
  // Fields here can depend on an answer from the case step (the record type), so
  // visibility is worked out from those earlier answers plus what is typed here.
  const visibilityValues = {
    ...Object.fromEntries(
      Object.entries(draft.answers).filter(([, value]) => typeof value === "string"),
    ),
    ...watchedValues,
  } as unknown as DynamicFieldValues;

  // When the requester says they are the document owner, the owner's name boxes
  // follow the requester's name as it is typed. They stay editable (a married
  // woman uses her maiden name on the form): once the owner's boxes differ from
  // what was last copied, they are left alone.
  const mirroredOwner = useRef<{
    first: string;
    middle: string;
    none: boolean;
    last: string;
  } | null>(null);
  const textOf = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const relationship = textOf(watchedValues.requester_relationship);
  const requesterFirst = textOf(watchedValues.requester_first_name);
  const requesterMiddle = textOf(watchedValues.requester_middle_name);
  const requesterLast = textOf(watchedValues.requester_last_name);
  useEffect(() => {
    if (!hasPersonGroup || roles.length !== 1) return;
    if (relationship !== "owner") {
      mirroredOwner.current = null;
      return;
    }
    // "N/A" is what the requester's "I don't have a middle name" box stores.
    const none = requesterMiddle === NONE_ANSWER;
    const next = {
      first: requesterFirst,
      middle: none ? "" : requesterMiddle,
      none,
      last: requesterLast,
    };
    const owner = form.getValues("subjects.0");
    if (!owner) return;
    const ownerBlank =
      !owner.firstName?.trim() &&
      !owner.middleName?.trim() &&
      !owner.lastName?.trim() &&
      !owner.noMiddleName;
    const last = mirroredOwner.current;
    const ownerUntouched =
      last !== null &&
      owner.firstName === last.first &&
      owner.middleName === last.middle &&
      owner.lastName === last.last &&
      Boolean(owner.noMiddleName) === last.none;
    if (!ownerBlank && !ownerUntouched) return;
    form.setValue("subjects.0.firstName", next.first);
    form.setValue("subjects.0.middleName", next.middle);
    form.setValue("subjects.0.lastName", next.last);
    form.setValue("subjects.0.noMiddleName", next.none);
    mirroredOwner.current = next;
    // `form`, `roles` and `hasPersonGroup` are stable for a given service.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationship, requesterFirst, requesterMiddle, requesterLast]);

  // The role comes from the field array, not the watched values: `role` has no
  // input of its own, so `shouldUnregister` drops it from the watched rows.
  const subjectsReady =
    !hasPersonGroup ||
    subjectFields.fields.every((field, index) => {
      const subject = watchedValues.subjects?.[index];
      return Boolean(
        subject?.firstName?.trim() &&
          subject.lastName?.trim() &&
          (!requireMiddleName || subject.middleName?.trim() || subject.noMiddleName) &&
          (isEmailMarriage || impliedSex(field.role) !== null || subject.sex),
      );
    });
  const hasRequiredAnswers =
    subjectsReady &&
    visibleFieldsForStep(definition, "details", visibilityValues).every((field) => {
      const value = watchedValues[field.key];
      return !field.required || (typeof value === "string" && value.trim() !== "");
    });

  function onSubmit(values: DetailsValues) {
    // Hidden suffix/sex controls are unregistered by React Hook Form. Convert
    // the submitted rows back to complete SubjectFields objects before saving
    // them in either `subjects` location in the draft.
    const subjects = reconcileSubjects(values.subjects, roles).map((subject) => isEmailMarriage ? { ...subject, sex: "male" } : subject);
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

  const labelRule = personGroupField?.labelByAnswer;
  const ownerLabel = labelRule
    ? (labelRule.labels[String(visibilityValues[labelRule.field] ?? "")] ?? undefined)
    : undefined;

  const ownerBlock =
    hasPersonGroup && showRoleLabels ? (
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
              husband={isEmailMarriage}
              requireMiddleName={requireMiddleName}
            />
          </PartySection>
        ))}
      </div>
    ) : hasPersonGroup ? (
      subjectFields.fields.map((subjectField, index) =>
        ownerLabel ? (
          // A heading that names whose name this is ("Full name of the deceased").
          <div key={subjectField.id} className="flex flex-col gap-3">
            <span className={WIZARD_LABEL_CLASS}>{ownerLabel}</span>
            <SubjectFieldGrid
              control={form.control}
              setValue={form.setValue}
              index={index}
              role={subjectField.role}
              husband={isEmailMarriage}
              requireMiddleName={requireMiddleName}
            />
          </div>
        ) : (
          <FieldGroup key={subjectField.id}>
            <SubjectFieldGrid
              control={form.control}
              setValue={form.setValue}
              index={index}
              role={subjectField.role}
              husband={isEmailMarriage}
              requireMiddleName={requireMiddleName}
            />
          </FieldGroup>
        ),
      )
    ) : null;

  return (
    <WizardShell
      step={2}
      title={ownerBlockInSection ? "Your details" : "Who is this document for?"}
      description={
        ownerBlockInSection
          ? "Tell us who is making this request, then who the record is for."
          : showRoleLabels
            ? "Enter each party's full name exactly as it should appear on the civil registry record."
            : "Enter the full name of the person named on the civil registry record, exactly as it should appear."
      }
    >
      <div className="flex flex-col gap-6">
        {ownerBlockInSection ? null : ownerBlock}

        <DynamicFormFields
          definition={definition}
          step="details"
          showRequiredMarks
          showSectionTitles={detailSections.length > 1}
          control={form.control}
          values={visibilityValues}
          renderSectionLead={
            ownerBlockInSection
              ? (section) => (section.key === personSection?.key ? ownerBlock : null)
              : undefined
          }
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
