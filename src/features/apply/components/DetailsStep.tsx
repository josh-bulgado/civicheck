import { birthRequesterRelationship } from "../birth-requester-relationship";
import { REQUESTER_NAME_KEYS, requesterNameAnswers, requiresAccountRequester } from "../requester-name";
import { ACCOUNT_PARTY_ROLE, accountPartyName, isMarriageAccountRole, requiresMarriageAccountParty } from "../marriage-account-party";
import { formatNameHeading } from "~/features/forms/field-label";
import { validatePersonName } from "~/lib/person-name";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
import { useApplyDraft, useSeedDraftForGroup } from "~/features/apply/hooks/useApplyDraft";
import { discardRequestUploadDraftFn } from "~/features/apply/apply.mutations";
import { EventTimingNotice } from "~/features/forms/components/EventTimingNotice";
import { DerivedAnswerAlerts } from "~/features/forms/components/DerivedAnswerAlerts";
import { TrackRedirectDialog } from "./TrackRedirectDialog";
import {
  DynamicFormFields,
  NONE_ANSWER,
  visibleFieldsForStep,
  type DynamicFieldValues,
} from "~/features/forms/components/DynamicFormFields";
import {
  WIZARD_CONTROL_CLASS,
  WIZARD_LABEL_CLASS,
  FORM_GROUP_CLASS,
  WizardFieldError,
} from "~/features/forms/components/wizard-field";
import {
  canonicalizeTemplateAnswers,
  evaluateTemplateEventTiming,
  fieldsForStep,
  getDerivedAnswerFeedback,
  resolveCaseSelectorServiceCode,
} from "~/features/forms/form-template.utils";
import { isOnTimeBirth, onTimeBirthLayout } from "../on-time-birth-layout";
import { delayedBirthLayout } from "../delayed-birth-layout";
import { isRequirementApplicable } from "~/features/services/service-utils";
import { isPetitionService, petitionDetailsLayout, petitionRecordType } from "~/features/services/petition-selection";
import type { ServiceDetail } from "~/features/services/services.queries";
import {
  impliedSex,
  NO_SUFFIX,
  reconcileSubjects,
  subjectsMatchRoles,
  SUFFIXES,
} from "~/lib/subject-fields";
import { cn } from "~/lib/utils";
import { courtDecreeRoles, courtRecordLayout, isCourtDecree } from "~/features/forms/court-decree";

type DetailsSubject = {
  role: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  sex: string;
  noMiddleName?: boolean;
};

export type DetailsValues = Record<string, string | DetailsSubject[]> & {
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
    showSuffix: role.toLowerCase() !== "wife" && (implied ?? sex) !== "female",
    showSex: implied === null,
  };
}

/**
 * A party's heading names the person once, so the inputs under it can keep
 * plain labels ("First name") instead of repeating "Mother's …" on every row.
 * The group is named for assistive tech, which announces the role on entry.
 */
function PartySection({ role, children, divider = true }: { role: string; children: ReactNode; divider?: boolean }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className={cn("flex flex-col gap-4", divider && "border-t border-border-light pt-6")}>
      <h2 id={headingId} className={FORM_GROUP_CLASS}>
        {formatNameHeading(role)}
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
  readOnly = false,
  lockedNoMiddleName = false,
}: {
  control: Control<DetailsValues>;
  setValue: UseFormSetValue<DetailsValues>;
  index: number;
  /** Starred: filled in, or the "I don't have one" box ticked. */
  required?: boolean;
  readOnly?: boolean;
  lockedNoMiddleName?: boolean;
}) {
  const inputId = `subject-${index}-middleName`;
  const watchedNone = useWatch({ control, name: `subjects.${index}.noMiddleName` }) === true;
  const none = readOnly ? lockedNoMiddleName : watchedNone;

  return (
    <Field>
      <FieldLabel htmlFor={inputId} className={WIZARD_LABEL_CLASS}>
        Middle Name {required && !none ? <RequiredMark /> : null}
      </FieldLabel>
      <Controller
        control={control}
        name={`subjects.${index}.middleName`}
        rules={{
          // Read the box from the form values, not from this render: ticking it
          // re-runs this check, and it must see the box as ticked.
          validate: (value, formValues) => {
            if (readOnly && lockedNoMiddleName) return true;
            if (formValues.subjects?.[index]?.noMiddleName === true) return true;
            if (required && !(value ?? "").trim()) return "Middle name is required";
            return validatePersonName(value ?? "");
          },
        }}
        render={({ field, fieldState }) => (
          <>
            <Input
              id={inputId}
              placeholder="Santos"
              maxLength={120}
              autoComplete="off"
              aria-invalid={fieldState.invalid}
              className={cn(WIZARD_CONTROL_CLASS, (none || readOnly) && "border-border-light bg-portal-panel", readOnly && "cursor-default text-portal-ink-2")}
              {...field}
              // A ticked box shows "N/A" (the saved name stays blank).
              value={none ? "N/A" : (field.value ?? "")}
              disabled={none}
              readOnly={readOnly}
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
              disabled={readOnly}
              checked={readOnly ? lockedNoMiddleName : field.value === true}
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
            No middle name
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
export function SubjectFieldGrid({
  husband = false,
  control,
  setValue,
  index,
  role,
  requireMiddleName = false,
  hideSex = false,
  readOnlyName = false,
  lockedNoMiddleName = false,
  firstNameHelp,
  children,
}: {
  control: Control<DetailsValues>;
  setValue: UseFormSetValue<DetailsValues>;
  index: number;
  role: string;
  husband?: boolean;
  requireMiddleName?: boolean;
  hideSex?: boolean;
  readOnlyName?: boolean;
  lockedNoMiddleName?: boolean;
  firstNameHelp?: string;
  children?: ReactNode;
}) {
  const watchedSex = useWatch({ control, name: `subjects.${index}.sex` });
  const { showSuffix, showSex } = subjectFieldVisibility(role, hideSex ? undefined : watchedSex);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-6 sm:*:col-span-3 md:*:col-span-2">
      <Controller
        control={control}
        name={`subjects.${index}.firstName`}
        rules={{ required: "First name is required", validate: validatePersonName }}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`subject-${index}-firstName`} className={WIZARD_LABEL_CLASS}>First Name <RequiredMark /></FieldLabel>
            <Input
              id={`subject-${index}-firstName`}
              readOnly={readOnlyName}
              placeholder={role === "Mother" ? "Maria" : "Juan"}
              maxLength={120}
              autoComplete="off"
              aria-invalid={fieldState.invalid}
              aria-describedby={firstNameHelp ? `subject-${index}-firstName-help` : undefined}
              className={cn(WIZARD_CONTROL_CLASS, readOnlyName && "cursor-default border-border-light bg-portal-panel text-portal-ink-2")}
              {...field}
            />
            {firstNameHelp ? <p id={`subject-${index}-firstName-help`} className="text-sm text-muted-foreground">{firstNameHelp}</p> : null}
            {fieldState.invalid && <WizardFieldError error={fieldState.error} />}
          </Field>
        )}
      />
      <MiddleNameField
        control={control}
        setValue={setValue}
        index={index}
        required={requireMiddleName}
        readOnly={readOnlyName}
        lockedNoMiddleName={lockedNoMiddleName}
      />
      <Controller
        control={control}
        name={`subjects.${index}.lastName`}
        rules={{ required: "Last name is required", validate: validatePersonName }}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`subject-${index}-lastName`} className={WIZARD_LABEL_CLASS}>Last Name <RequiredMark /></FieldLabel>
            <Input
              id={`subject-${index}-lastName`}
              readOnly={readOnlyName}
              placeholder="Dela Cruz"
              maxLength={120}
              autoComplete="off"
              aria-invalid={fieldState.invalid}
              className={cn(WIZARD_CONTROL_CLASS, readOnlyName && "cursor-default border-border-light bg-portal-panel text-portal-ink-2")}
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
                disabled={readOnlyName}
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
                <SelectContent className="service-form-options">
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
      {showSex && !husband && !hideSex && (
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
                <SelectContent className="service-form-options">
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
      {children}
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
  const { draft, update, hydrated, clear } = useApplyDraft(serviceCode);
  const seedDraftForGroup = useSeedDraftForGroup();
  const [redirectOpen, setRedirectOpen] = useState(false);
  const selectedService =
    services.find((s) => s.service_code === draft.selectedServiceCode) ?? services[0];
  const petitionAnswers = { ...draft.answers, ...draft.caseSelectorAnswers };
  const definition = courtRecordLayout(petitionDetailsLayout(
    birthRequesterRelationship(onTimeBirthLayout(delayedBirthLayout(selectedService.form_template!.definition, selectedService.service_code), selectedService.service_code), selectedService.service_code),
    selectedService.service_code, petitionAnswers,
  ), petitionAnswers);
  const onTimeBirth = isOnTimeBirth(selectedService.service_code);
  const isMarriageLicense = selectedService.service_code === "MARRIAGE_LICENSE";
  const isDelayedBirth = selectedService.service_code === "BIRTH_DELAYED" || selectedService.service_code.startsWith("DCOLB-");
  const isLegitimation = selectedService.service_code === "LEGITIMATION";
  const isSurnameChange = selectedService.service_code === "RA9255_SURNAME";
  const isSupplemental = selectedService.service_code === "SUPPLEMENTAL_REPORT";
  const isAdoption = selectedService.service_code === "COURT-FOREIGN-ADOPTION" &&
    (draft.caseSelectorAnswers.court_decree_type ?? draft.answers.court_decree_type) === "adoption";
  const isForeignDecree = selectedService.service_code === "COURT-FOREIGN-ADOPTION" &&
    (draft.caseSelectorAnswers.court_decree_type ?? draft.answers.court_decree_type) === "foreign_decree";
  const courtNameOnly = isAdoption || isForeignDecree || selectedService.service_code === "COURT-ANNULMENT";
  const showBirthDetailsWithChild = onTimeBirth || isDelayedBirth || isLegitimation || isSurnameChange;
  const lockRequesterName = requiresAccountRequester(selectedService.service_code);
  const lockAccountParty = selectedService.service_code === "MARRIAGE_LICENSE";
  const detailsFields = fieldsForStep(definition, "details");
  const personGroupField = detailsFields.find((field) => field.type === "person_group");
  const hasPersonGroup = Boolean(personGroupField);
  const recordType = isPetitionService(selectedService.service_code) ? petitionRecordType(petitionAnswers)
    : draft.caseSelectorAnswers.record_type ?? draft.answers.record_type;
  const primaryPetition = draft.caseSelectorAnswers.primary_petition ?? draft.answers.primary_petition;
  const isBirthPetition = isPetitionService(selectedService.service_code) &&
    (primaryPetition === "change_first_name" || primaryPetition === "correct_sex" ||
      primaryPetition === "correct_birth_day_month" || (primaryPetition === "correct_other" && recordType === "birth"));
  const isMarriageRecord = recordType === "marriage" && !isCourtDecree(selectedService.service_code);
  const supplementalRecordLayout = isSupplemental && ["birth", "death"].includes(recordType ?? "");
  const useSpouseLabels =
    selectedService.service_code === "MARRIAGE_ONTIME" ||
    selectedService.service_code === "MARRIAGE_DELAYED";
  const requireMiddleName = true;
  const roles = courtDecreeRoles(selectedService.service_code, petitionAnswers, selectedService?.party_roles?.length
    ? selectedService.party_roles
    : ["Subject"]);

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

  useEffect(() => {
    if (!hydrated || !user || !lockRequesterName) return;
    const names = requesterNameAnswers(user);
    const keys = REQUESTER_NAME_KEYS.filter((key) => detailsFields.some((field) => field.key === key));
    if (!keys.length || keys.every((key) => draft.answers[key] === names[key])) return;
    update((previous) => {
      if (keys.every((key) => previous.answers[key] === names[key])) return {};
      return { answers: { ...previous.answers, ...Object.fromEntries(keys.map((key) => [key, names[key]])) } };
    });
  }, [hydrated, user, lockRequesterName, detailsFields, draft.answers, update]);

  const subjectFields = useFieldArray({ control: form.control, name: "subjects" });
  const autofillOwnerName = isBirthPetition || (isSupplemental && recordType === "birth");
  const seededOwner = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !user || !autofillOwnerName || roles.length !== 1) return;
    if (seededOwner.current === selectedService.service_code) return;
    seededOwner.current = selectedService.service_code;
    const current = reconcileSubjects(draft.subjects, roles);
    const owner = current[0];
    if (owner.firstName.trim() || owner.middleName.trim() || owner.lastName.trim() || owner.noMiddleName) return;
    current[0] = { ...owner, ...accountPartyName(user) };
    update({ subjects: current });
    // Seed a blank draft once; later edits belong to the applicant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user, autofillOwnerName, selectedService.service_code, roles.join("|"), draft.subjects, update]);
  const showRoleLabels = hasPersonGroup && subjectFields.fields.length > 1;

  // Every starred input is filled in — the same set the form validates on
  // submit: each person's first name, last name and (where the role doesn't
  // imply it) sex, plus every visible required template field. The Next button
  // reads this to show when the step is ready.
  const watchedValues = form.watch();
  const accountRole = lockAccountParty ? watchedValues[ACCOUNT_PARTY_ROLE] : undefined;
  const accountHasNoMiddleName = user ? accountPartyName(user).noMiddleName : false;
  const previousAccountRole = useRef(draft.answers[ACCOUNT_PARTY_ROLE]);
  useEffect(() => {
    if (!hydrated || !lockAccountParty || !user || !isMarriageAccountRole(accountRole)) return;
    const names = accountPartyName(user);
    const current = reconcileSubjects(form.getValues("subjects"), roles);
    if (previousAccountRole.current !== accountRole) {
      const oldIndex = roles.indexOf(String(previousAccountRole.current));
      if (oldIndex >= 0) current[oldIndex] = reconcileSubjects([], [roles[oldIndex]])[0];
    }
    previousAccountRole.current = accountRole;
    const index = roles.indexOf(accountRole);
    if (index < 0) return;
    // Suffixes are not collected for the Bride role.
    const next = { ...names, suffix: accountRole === "Bride" ? "" : names.suffix };
    const unchanged = Object.entries(next).every(([key, value]) =>
      current[index][key as keyof DetailsSubject] === value,
    );
    if (unchanged && draft.answers[ACCOUNT_PARTY_ROLE] === accountRole) return;
    current[index] = { ...current[index], ...next };
    current.forEach((subject, subjectIndex) => {
      form.setValue(`subjects.${subjectIndex}.firstName`, subject.firstName);
      form.setValue(`subjects.${subjectIndex}.middleName`, subject.middleName);
      form.setValue(`subjects.${subjectIndex}.lastName`, subject.lastName);
      form.setValue(`subjects.${subjectIndex}.suffix`, subject.suffix);
      form.setValue(`subjects.${subjectIndex}.noMiddleName`, subject.noMiddleName === true);
    });
    form.clearErrors(`subjects.${index}.middleName`);
    const currentDetails = Object.fromEntries(Object.entries(form.getValues())
      .filter((entry) => typeof entry[1] === "string"));
    update((previous) => ({
      subjects: current,
      answers: { ...previous.answers, ...currentDetails, [ACCOUNT_PARTY_ROLE]: accountRole, ...(personGroupField ? { [personGroupField.key]: current } : {}) },
    }));
    // Roles are compared by their contents, and form methods are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, lockAccountParty, accountRole, user, roles.join("|"), draft.answers[ACCOUNT_PARTY_ROLE], update]);
  // Fields here can depend on an answer from the case step (the record type), so
  // visibility is worked out from those earlier answers plus what is typed here.
  const visibilityValues = {
    ...draft.caseSelectorAnswers,
    ...Object.fromEntries(
      Object.entries(draft.answers).filter(([, value]) => typeof value === "string"),
    ),
    ...watchedValues,
  } as unknown as DynamicFieldValues;

  const liveBirthDate = isDelayedBirth ? visibilityValues.event_date : "";
  const liveBirthService = isDelayedBirth && liveBirthDate
    ? resolveCaseSelectorServiceCode(definition, canonicalizeTemplateAnswers(definition, {
      ...draft.answers,
      ...watchedValues,
      ...draft.caseSelectorAnswers,
    }))
    : null;

  useEffect(() => {
    if (!hydrated || !liveBirthService || !services.some((service) => service.service_code === liveBirthService)) return;
    if (draft.selectedServiceCode === liveBirthService && draft.answers.event_date === liveBirthDate) return;
    // Save the current inputs before changing services so the form keeps edits.
    const values = form.getValues();
    update((previous) => {
      const answers = {
        ...previous.answers,
        ...Object.fromEntries(Object.entries(values).filter(([, value]) => typeof value === "string")),
        ...(personGroupField ? { [personGroupField.key]: values.subjects } : {}),
      };
      const answerBag = canonicalizeTemplateAnswers(definition, { ...answers, ...previous.caseSelectorAnswers });
      return {
        selectedServiceCode: liveBirthService,
        eventDate: liveBirthDate,
        subjects: values.subjects,
        answers,
        documents: previous.documents.filter((document) => requirements.some((requirement) =>
          requirement.id === document.requirementId && isRequirementApplicable(requirement, liveBirthService, answerBag),
        )),
      };
    });
  }, [hydrated, liveBirthService, liveBirthDate, draft.selectedServiceCode, draft.answers.event_date, services, form, update, personGroupField, definition, requirements]);

  const detailsTiming = definition.eventTiming && detailsFields.some((field) => field.key === definition.eventTiming?.triggerField)
    ? evaluateTemplateEventTiming(definition, visibilityValues)
    : null;
  const timingMismatch = detailsTiming?.evaluation.mismatched ? detailsTiming : null;
  const timingBlocks = timingMismatch && ["block", "redirect_confirm"].includes(timingMismatch.rule.behavior);
  const blockingMarriageAge = isMarriageLicense
    ? getDerivedAnswerFeedback(definition, visibilityValues).find((item) => item.notice.blocksProgress)
    : undefined;

  function switchRegistrationTrack() {
    if (!detailsTiming) return;
    const values = form.getValues();
    seedDraftForGroup(detailsTiming.rule.targetServiceCode, {
      ...draft,
      selectedServiceCode: null,
      answers: { ...draft.answers, ...values },
      subjects: reconcileSubjects(values.subjects, roles),
      eventDate: typeof values.event_date === "string" ? values.event_date : "",
      eventPlace: typeof values.event_place === "string" ? values.event_place : "",
      documents: [],
      uploadDraftId: null,
    });
    clear();
    if (draft.uploadDraftId) void discardRequestUploadDraftFn({ data: { uploadDraftId: draft.uploadDraftId } }).catch(() => {});
    navigate({ to: "/apply/$serviceCode/case", params: { serviceCode: detailsTiming.rule.targetServiceCode } });
  }

  // When the requester says they are the document owner, the owner's name boxes
  // follow the requester's name as it is typed. They stay editable (a married
  // woman uses her maiden name on the form): once the owner's boxes differ from
  // what was last copied, they are left alone.
  const mirroredOwner = useRef<{
    first: string;
    middle: string;
    none: boolean;
    last: string;
    suffix: string;
  } | null>(null);
  const textOf = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const relationship = textOf(watchedValues.requester_relationship);
  useEffect(() => {
    if (recordType !== "death" || relationship !== "owner") return;
    form.setValue("requester_relationship", "");
    update((previous) => ({ answers: { ...previous.answers, requester_relationship: "" } }));
  }, [recordType, relationship, form, update]);
  const emailRecordOwner =
    selectedService.service_code === "EMAIL_INQUIRY" &&
    (draft.caseSelectorAnswers.is_record_owner ?? draft.answers.is_record_owner) === "yes";
  const requesterFirst = textOf(watchedValues.requester_first_name);
  const requesterMiddle = textOf(watchedValues.requester_middle_name);
  const requesterLast = textOf(watchedValues.requester_last_name);
  const requesterSuffix = textOf(lockRequesterName && user ? user.suffix : watchedValues.requester_suffix);
  useEffect(() => {
    if (!hasPersonGroup || roles.length !== 1) return;
    if ((isMarriageRecord && !emailRecordOwner) || recordType === "death" ||
        (relationship !== "owner" && !emailRecordOwner)) {
      mirroredOwner.current = null;
      return;
    }
    // "N/A" is what the requester's "No middle name" box stores.
    const none = requesterMiddle === NONE_ANSWER || !requesterMiddle;
    const next = {
      first: requesterFirst,
      middle: none ? "" : requesterMiddle,
      none,
      last: requesterLast,
      suffix: subjectFieldVisibility(roles[0], form.getValues("subjects.0.sex")).showSuffix ? requesterSuffix : "",
    };
    const owner = form.getValues("subjects.0");
    if (!owner) return;
    const ownerBlank =
      !owner.firstName?.trim() &&
      !owner.middleName?.trim() &&
      !owner.lastName?.trim() &&
      !owner.suffix?.trim() &&
      !owner.noMiddleName;
    const last = mirroredOwner.current;
    const ownerUntouched =
      last !== null &&
      owner.firstName === last.first &&
      owner.middleName === last.middle &&
      owner.lastName === last.last &&
      (owner.suffix ?? "") === last.suffix &&
      Boolean(owner.noMiddleName) === last.none;
    if (!ownerBlank && !ownerUntouched) return;
    form.setValue("subjects.0.firstName", next.first);
    form.setValue("subjects.0.middleName", next.middle);
    form.setValue("subjects.0.lastName", next.last);
    form.setValue("subjects.0.suffix", next.suffix);
    form.setValue("subjects.0.noMiddleName", next.none);
    mirroredOwner.current = next;
    // `form`, `roles` and `hasPersonGroup` are stable for a given service.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarriageRecord, recordType, relationship, emailRecordOwner, requesterFirst, requesterMiddle, requesterLast, requesterSuffix]);

  // The role comes from the field array, not the watched values: `role` has no
  // input of its own, so `shouldUnregister` drops it from the watched rows.
  const subjectsReady =
    !hasPersonGroup ||
    subjectFields.fields.every((field, index) => {
      const subject = watchedValues.subjects?.[index];
      return Boolean(
        subject?.firstName?.trim() &&
          subject.lastName?.trim() &&
          (!requireMiddleName || subject.middleName?.trim() || subject.noMiddleName ||
            (lockAccountParty && field.role === accountRole && accountHasNoMiddleName)) &&
          (courtNameOnly || isMarriageRecord || impliedSex(field.role) !== null || subject.sex),
      );
    });
  const hasRequiredAnswers =
    subjectsReady &&
    visibleFieldsForStep(definition, "details", visibilityValues).every((field) => {
      const value = watchedValues[field.key];
      return !field.required || (typeof value === "string" && value.trim() !== "");
    });

  function onSubmit(values: DetailsValues) {
    if (isMarriageLicense && getDerivedAnswerFeedback(definition, { ...visibilityValues, ...values })
      .some((item) => item.notice.blocksProgress)) return;
    if (lockAccountParty && !isMarriageAccountRole(values[ACCOUNT_PARTY_ROLE])) {
      form.setError(ACCOUNT_PARTY_ROLE, { message: "Select your role." });
      return;
    }
    if (timingBlocks) {
      setRedirectOpen(true);
      return;
    }
    // Hidden suffix/sex controls are unregistered by React Hook Form. Convert
    // the submitted rows back to complete SubjectFields objects before saving
    // them in either `subjects` location in the draft.
    const subjects = reconcileSubjects(values.subjects, roles).map((subject) => {
      const next = courtNameOnly ? { ...subject, sex: "" } : isMarriageRecord ? { ...subject, sex: "male" } : subject;
      return lockAccountParty && subject.role === values[ACCOUNT_PARTY_ROLE] && user
        ? { ...next, ...accountPartyName(user), suffix: subject.role === "Bride" ? "" : (user.suffix ?? "") }
        : next;
    });
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
      const selectedServiceCode = definition !== selectedService.form_template!.definition
        ? resolveCaseSelectorServiceCode(definition, answerBag) ?? previous.selectedServiceCode
        : previous.selectedServiceCode;
      const visibleRequirementIds = new Set(
        requirements
          .filter((requirement) =>
            isRequirementApplicable(
              requirement,
              selectedServiceCode,
              answerBag,
            ),
          )
          .map((requirement) => requirement.id),
      );
      return {
        selectedServiceCode,
        subjects,
        contactNumber:
          typeof values.contact_number === "string"
            ? values.contact_number
            : "",
        answers,
        ...(detailsFields.some((field) => field.key === "event_date") ? { eventDate: typeof values.event_date === "string" ? values.event_date : "" } : {}),
        ...(detailsFields.some((field) => field.key === "event_place") ? { eventPlace: typeof values.event_place === "string" ? values.event_place : "" } : {}),
        documents: previous.documents.filter((document) =>
          visibleRequirementIds.has(document.requirementId),
        ),
      };
    });
    navigate({ to: "/apply/$serviceCode/documents", params: { serviceCode } });
  }

  const labelRule = personGroupField?.labelByAnswer;
  const ownerLabel = isPetitionService(selectedService.service_code) && !isBirthPetition
    ? (recordType === "marriage" ? "Husband's Name" : recordType === "death" ? "Deceased Person's Name" : undefined)
    : labelRule
    ? (labelRule.labels[String(visibilityValues[labelRule.field] ?? "")] ?? undefined)
    : undefined;

  const supplementalRecordField = (key: "event_date" | "event_place") => (
    <DynamicFormFields
      singleColumn
      definition={{
        ...definition,
        sections: definition.sections.map((section) => ({
          ...section,
          fields: section.fields.filter((field) => field.key === key),
        })),
      }}
      step="details"
      hideSectionTitles
      showRequiredMarks
      control={form.control}
      values={visibilityValues}
      onFieldChange={(field, value) => form.setValue(field, value, { shouldDirty: true, shouldValidate: true })}
    />
  );

  const ownerBlock =
    hasPersonGroup && showRoleLabels ? (
      // Each party is its own headed section, stacked, so its name parts
      // can run across the card instead of sharing narrow columns.
      <div className="flex flex-col gap-7.5">
        {subjectFields.fields
          .map((subjectField, index) => ({ subjectField, index }))
          .sort((a, b) =>
            useSpouseLabels
              ? Number(b.subjectField.role === "Groom") - Number(a.subjectField.role === "Groom")
              : a.index - b.index,
          )
          .map(({ subjectField, index }) => (
          <PartySection
            key={subjectField.id}
            divider={useSpouseLabels
              ? subjectField.role !== "Groom"
              : (!onTimeBirth && !isLegitimation && !isCourtDecree(selectedService.service_code)) || index > 0}
            role={
              useSpouseLabels
                ? ({ Bride: "Maiden Name of Wife", Groom: "Husband" }[subjectField.role] ?? subjectField.role)
                : isMarriageLicense ? `${subjectField.role}'s Information`
                : onTimeBirth && subjectField.role === "Child" ? "Child's Information"
                : subjectField.role === "Mother" ? "Mother's Maiden Name" : subjectField.role
            }
          >
            <SubjectFieldGrid
              control={form.control}
              setValue={form.setValue}
              index={index}
              role={subjectField.role}
              husband={isMarriageRecord}
              requireMiddleName={requireMiddleName}
              readOnlyName={lockAccountParty && subjectField.role === accountRole}
              lockedNoMiddleName={accountHasNoMiddleName}
              hideSex={courtNameOnly}
            >
              {(onTimeBirth || isDelayedBirth) && subjectField.role === "Child" ? (
                <DynamicFormFields
                  singleColumn
                  definition={{
                    ...definition,
                    sections: definition.sections.map((section) => ({
                      ...section,
                      fields: section.fields.filter((field) => field.key === "event_date"),
                    })),
                  }}
                  step="details"
                  hideSectionTitles
                  showRequiredMarks
                  control={form.control}
                  values={visibilityValues}
                  onDateChange={(key, value) => {
                    if (key !== definition.eventTiming?.triggerField) return;
                    const timing = evaluateTemplateEventTiming(definition, { ...visibilityValues, [key]: value });
                    if (timing?.evaluation.mismatched && timing.rule.behavior === "redirect_confirm") setRedirectOpen(true);
                  }}
                />
              ) : null}
              {isMarriageLicense ? (
                <DynamicFormFields
                  singleColumn
                  definition={{
                    ...definition,
                    sections: definition.sections.map((section) => ({
                      ...section,
                      fields: section.fields.filter((field) => field.key ===
                        (subjectField.role === "Bride" ? "bride_date_of_birth" : "groom_date_of_birth"))
                        .map((field) => ({ ...field, label: "Date of Birth" })),
                    })).filter((section) => section.fields.length > 0),
                  }}
                  step="details"
                  hideSectionTitles
                  showRequiredMarks
                  control={form.control}
                  values={visibilityValues}
                />
              ) : null}
            </SubjectFieldGrid>
            {(showBirthDetailsWithChild && subjectField.role === "Child") || (isLegitimation && subjectField.role === "Father") ? (
              <div className={isLegitimation && subjectField.role === "Father"
                ? "border-t border-border-light pt-4"
                : onTimeBirth || isDelayedBirth ? "pt-3" : isLegitimation || isSurnameChange ? "pt-1" : undefined}>
              <DynamicFormFields
                singleColumn={onTimeBirth || isDelayedBirth}
                definition={{
                  ...definition,
                  sections: definition.sections.map((section) => ({
                    ...section,
                    fields: section.fields.filter((field) => (
                      subjectField.role === "Father" ? ["marriage_date", "marriage_place"] : onTimeBirth || isDelayedBirth ? ["event_place"] : ["event_date", "event_place"]
                    ).includes(field.key)),
                  })),
                }}
                step="details"
                hideSectionTitles
                showRequiredMarks
                control={form.control}
                values={visibilityValues}
                onDateChange={(key, value) => {
                  if (key !== definition.eventTiming?.triggerField) return;
                  const timing = evaluateTemplateEventTiming(definition, { ...visibilityValues, [key]: value });
                  if (timing?.evaluation.mismatched && timing.rule.behavior === "redirect_confirm") setRedirectOpen(true);
                }}
              />
              </div>
            ) : null}
          </PartySection>
        ))}
      </div>
    ) : hasPersonGroup ? (
      subjectFields.fields.map((subjectField, index) =>
        ownerLabel && (!isPetitionService(selectedService.service_code) || !isBirthPetition) ? (
          // A heading that names whose name this is ("Full name of the deceased").
          <div key={subjectField.id} className={cn("flex flex-col gap-3", (!isSupplemental || ownerBlockInSection) && "border-t border-border-light pt-6")}>
            {!(isSupplemental && isMarriageRecord) ? <span className={FORM_GROUP_CLASS}>{formatNameHeading(ownerLabel)}</span> : null}
            {isSupplemental && isMarriageRecord ? <h3 className={FORM_GROUP_CLASS}>Husband's Name</h3> : null}
            <SubjectFieldGrid
              control={form.control}
              setValue={form.setValue}
              index={index}
              role={subjectField.role}
              husband={isMarriageRecord}
              requireMiddleName={requireMiddleName}
            >
              {supplementalRecordLayout ? supplementalRecordField("event_date") : null}
            </SubjectFieldGrid>
            {supplementalRecordLayout ? (
              <div className="pt-3">{supplementalRecordField("event_place")}</div>
            ) : null}
          </div>
        ) : (
          <FieldGroup key={subjectField.id} className={isAdoption ? "gap-3" : undefined}>
            {courtNameOnly ? (
              <div className="flex flex-col gap-1">
                {isAdoption ? (
                  <h2 className={FORM_GROUP_CLASS}>Adopted person's name</h2>
                ) : (
                  <h2 className={FORM_GROUP_CLASS}>Name on the birth record</h2>
                )}
                <p className="text-[15px] text-body-2">Enter the name as recorded on the birth certificate.</p>
              </div>
            ) : null}
            <SubjectFieldGrid
              control={form.control}
              setValue={form.setValue}
              index={index}
              role={subjectField.role}
              husband={isMarriageRecord}
              requireMiddleName={requireMiddleName}
              firstNameHelp={isBirthPetition ? "Use the first name shown on your birth certificate." : undefined}
              hideSex={courtNameOnly}
            />
          </FieldGroup>
        ),
      )
    ) : null;

  return (
    <WizardShell
      step={2}
      title="Person and Record Details"
    >
      <div className="flex flex-col gap-6">
        {ownerBlockInSection ? null : ownerBlock}

        <DynamicFormFields
          readOnlyKeys={lockRequesterName ? REQUESTER_NAME_KEYS : []}
          widePair={isPetitionService(selectedService.service_code) || useSpouseLabels ? ["event_date", "event_place"] : undefined}
          definition={supplementalRecordLayout ? {
            ...definition,
            sections: definition.sections.map((section) => ({
              ...section,
              fields: section.fields.filter((field) => !["event_date", "event_place"].includes(field.key)),
            })),
          } : isMarriageLicense ? {
            ...definition,
            sections: definition.sections.map((section) => ({
              ...section,
              fields: section.fields.filter((field) => !["bride_date_of_birth", "groom_date_of_birth"].includes(field.key)),
            })),
          } : showBirthDetailsWithChild && showRoleLabels && subjectFields.fields.some((field) => field.role === "Child") ? {
            ...definition,
            sections: definition.sections.map((section) => ({
              ...section,
              fields: section.fields.filter((field) => !(isLegitimation
                ? ["event_date", "event_place", "marriage_date", "marriage_place"]
                : ["event_date", "event_place"]).includes(field.key)),
            })),
          } : definition}
          step="details"
          onDateChange={(key, value) => {
            if (key !== definition.eventTiming?.triggerField) return;
            const timing = evaluateTemplateEventTiming(definition, { ...visibilityValues, [key]: value });
            if (timing?.evaluation.mismatched && timing.rule.behavior === "redirect_confirm") setRedirectOpen(true);
          }}
          showRequiredMarks
          showSectionTitles={detailSections.length > 1}
          hideSectionTitles={requiresMarriageAccountParty(selectedService.service_code)}
          control={form.control}
          onFieldChange={(key, value) => form.setValue(key, value, { shouldDirty: true, shouldValidate: true })}
          values={visibilityValues}
          renderSectionLead={
            ownerBlockInSection
              ? (section) => (section.key === personSection?.key
                ? useSpouseLabels
                  ? <div className="border-b border-border-light pb-6">{ownerBlock}</div>
                  : ownerBlock
                : null)
              : undefined
          }
        />

        {isMarriageLicense ? <DerivedAnswerAlerts definition={definition} answers={visibilityValues} compact /> : null}

        {timingMismatch ? (
          <EventTimingNotice behavior={timingMismatch.rule.behavior} title={timingMismatch.rule.title}
            description="" ctaLabel={timingMismatch.rule.ctaLabel}
            onCta={() => setRedirectOpen(true)} />
        ) : null}
        <WizardFooterActions
          onBack={() =>
            navigate({ to: "/apply/$serviceCode/case", params: { serviceCode } })
          }
          onContinue={form.handleSubmit(onSubmit)}
          continueLabel="Next"
          continueReady={hasRequiredAnswers && !timingBlocks && !blockingMarriageAge}
          continueDisabled={Boolean(blockingMarriageAge)}
        />
      </div>
      <TrackRedirectDialog open={redirectOpen} onOpenChange={setRedirectOpen}
        title={detailsTiming?.rule.title ?? ""} description=""
        switchLabel={detailsTiming?.rule.ctaLabel ?? "Switch service"}
        onKeepEditing={() => setRedirectOpen(false)} onSwitch={switchRegistrationTrack}
        returnFocusTo={() => detailsTiming ? document.getElementById(`dynamic-${detailsTiming.rule.triggerField}`) : null} />
    </WizardShell>
  );
}
