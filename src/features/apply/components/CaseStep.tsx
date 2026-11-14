import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { CalendarClock } from "lucide-react";
import { EventTimingNotice } from "~/features/forms/components/EventTimingNotice";
import { NoticeAlert } from "~/features/forms/components/NoticeAlert";
import { TrackRedirectDialog } from "~/features/apply/components/TrackRedirectDialog";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import {
  DynamicFormFields,
  visibleFieldsForStep,
  type DynamicFieldValues,
} from "~/features/forms/components/DynamicFormFields";
import { DerivedAnswerAlerts } from "~/features/forms/components/DerivedAnswerAlerts";
import {
  canonicalizeTemplateAnswers,
  evaluateEventTiming,
  evaluateTemplateEventTiming,
  fieldsForStep,
  getDerivedAnswerFeedback,
  getSelectedOptionNotices,
  todayKeyInTimeZone,
} from "~/features/forms/form-template.utils";
import type { EventTimingRule } from "~/features/forms/form-template.types";
import { isRequirementApplicable } from "~/features/services/service-utils";
import { CopiesStepper } from "~/features/services/components/CopiesStepper";
import type { ServiceDetail } from "~/features/services/services.queries";
import {
  useApplyDraft,
  useSeedDraftForGroup,
} from "~/features/apply/hooks/useApplyDraft";
import { discardRequestUploadDraftFn } from "~/features/apply/apply.mutations";
import { ageInYears } from "~/lib/date";
import {
  CaseSelector,
  inferMaritalStatus,
} from "~/features/services/components/CaseSelector";
import { applicantCopy } from "~/features/forms/applicant-copy";
import { surnameChangeCaseDefinition } from "~/features/services/surname-change";
import { isOnTimeBirth, onTimeBirthLayout } from "../on-time-birth-layout";
import { delayedBirthLayout } from "../delayed-birth-layout";
import { birthRequesterRelationship } from "../birth-requester-relationship";
import { isPetitionService, petitionCaseLayout, petitionSelectionError } from "~/features/services/petition-selection";

function caseAnswersFrom(values: DynamicFieldValues) {
  return {
    purpose: values.purpose ?? "",
    otherPurpose: values.purpose_other ?? "",
    additionalNotes: values.additional_notes ?? "",
    referenceNumber: values.reference_number ?? "",
    placeType: values.place_type ?? "",
    informantName: values.informant_name ?? "",
    informantRelationship: values.informant_relationship ?? "",
  };
}

// The seeded wording of the birth on-time rule. It states a problem, so the
// dialog says the same thing calmly. A rule an admin has written their own
// copy for (or any other service's rule) keeps its words untouched.
const SEEDED_LATE_BIRTH_TITLE = "This date is more than 30 days ago";

function trackRedirectCopy(rule: EventTimingRule) {
  if (
    rule.targetServiceCode === "birth_delayed" &&
    rule.mismatch === "outside_window" &&
    rule.title === SEEDED_LATE_BIRTH_TITLE
  ) {
    return {
      title: `This birth date is over ${rule.windowDays} days ago`,
      description: `Births registered more than ${rule.windowDays} days after birth require Delayed Registration.`,
    };
  }
  return {
    title: applicantCopy(rule.title),
    description: applicantCopy(rule.description),
  };
}

interface CaseStepProps {
  serviceCode: string;
  isGroup: ServiceDetail["isGroup"];
  requirements: ServiceDetail["requirements"];
  services: ServiceDetail["services"];
}

export function CaseStep({
  serviceCode,
  isGroup,
  requirements,
  services,
}: CaseStepProps) {
  const navigate = useNavigate();
  const { draft, update, hydrated, clear } = useApplyDraft(serviceCode);
  const seedDraftForGroup = useSeedDraftForGroup();
  const selectedService =
    services.find((service) => service.service_code === draft.selectedServiceCode) ??
    services[0];
  const onTimeBirth = isOnTimeBirth(selectedService.service_code);
  const definition = birthRequesterRelationship(onTimeBirthLayout(delayedBirthLayout(selectedService.form_template!.definition, selectedService.service_code), selectedService.service_code), selectedService.service_code);
  const isDelayedBirth = serviceCode === "birth_delayed" ||
    selectedService.service_code === "BIRTH_DELAYED" ||
    selectedService.service_code.startsWith("DCOLB-");
  const requestDetailKeys = new Set([
    "event_date", "event_place", "informant_relationship", "informant_name",
  ]);
  const caseDefinition = petitionCaseLayout(surnameChangeCaseDefinition(definition, selectedService.service_code), selectedService.service_code);
  const questionDefinition = {
    ...caseDefinition,
    sections: caseDefinition.sections.map((section) => ({
      ...section,
      fields: section.fields.filter((field) => !requestDetailKeys.has(field.key) &&
        !(isGroup && field.key === "additional_identity"))
        .sort((a, b) => Number(a.key === "place_type") - Number(b.key === "place_type")),
    })),
  };
  const requestDetailsDefinition = isDelayedBirth ? {
    ...caseDefinition,
    sections: caseDefinition.sections.map((section) => ({
      ...section,
      fields: section.fields.filter((field) => requestDetailKeys.has(field.key)),
    })),
  } : caseDefinition;
  const caseSelectorDefinition =
    services[0]?.form_template?.definition.caseSelector;
  const caseFields = fieldsForStep(definition, "case").filter(
    (field) => field.type !== "person_group",
  );

  // Persisting the single-service default into the draft (rather than just
  // resolving it for render, above) matters because downstream steps and the
  // final submission read `draft.selectedServiceCode` directly, and
  // requirement visibility for case-tagged requirements treats a missing
  // code as "not applicable" — see `isVisible` in service-utils.
  useEffect(() => {
    if (hydrated && !isGroup && !draft.selectedServiceCode) {
      update({ selectedServiceCode: services[0].service_code });
    }
  }, [hydrated, isGroup, draft.selectedServiceCode, services, update]);

  const formValues = Object.fromEntries(
    caseFields.map((field) => {
      const value = draft.answers[field.key];
      return [
        field.key,
        typeof value === "string"
          ? value
          : field.key === "purpose"
            ? "Local Use (ID, Barangay, etc.)"
            : "",
      ];
    }),
  );
  const form = useForm<DynamicFieldValues>({
    mode: "onBlur",
    values: formValues,
    shouldUnregister: true,
  });
  const watchedValues = form.watch();
  const derivedCaseAnswers = canonicalizeTemplateAnswers(definition, {
    ...draft.answers,
    ...watchedValues,
    ...draft.caseSelectorAnswers,
  });
  const selectorContextAnswers = Object.fromEntries(
    Object.entries(derivedCaseAnswers).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
  // The birth date on the next page determines the final age-specific service.
  if (isDelayedBirth && !selectorContextAnswers.age) selectorContextAnswers.age = "0-79";
  const blockingAgeFeedback = (isDelayedBirth ? [] : getDerivedAnswerFeedback(
    definition,
    derivedCaseAnswers,
  )).find((feedback) => feedback.notice.blocksProgress);
  const blockingOptionNotice = getSelectedOptionNotices(
    definition,
    derivedCaseAnswers,
  ).find((selected) => selected.notice.blocksProgress)?.notice;
  // Every starred input is filled in. Mirrors what the form validates on
  // submit: the case-selector questions resolve to a service only once they are
  // all answered, and each field that is visible right now and marked required
  // must have a value. The Next button uses this to show when the step is
  // ready, without waiting for a failed submit to find out.
  const hasRequiredAnswers =
    (!isPetitionService(selectedService.service_code) || !petitionSelectionError(draft.caseSelectorAnswers)) &&
    (!isGroup || Boolean(draft.selectedServiceCode)) &&
    visibleFieldsForStep(caseDefinition, "case", {
      ...draft.caseSelectorAnswers,
      ...watchedValues,
    }).every((field) => {
      const value = watchedValues[field.key];
      return !field.required || (typeof value === "string" && value.trim() !== "");
    });

  // Data-driven on-time window. The rule and its routing target live in the
  // published form template, so any current or future service can declare one.
  const timing = caseFields.some((field) => field.key === definition.eventTiming?.triggerField)
    ? evaluateTemplateEventTiming(definition, derivedCaseAnswers)
    : null;
  const timingRule = timing?.rule ?? null;
  const timingDeferred = timingRule?.requireDocumentFirst === true;
  const timingMismatch =
    timing && timing.evaluation.mismatched && !timingDeferred
      ? timing.evaluation
      : null;
  const timingDeferredNotice =
    timing && timing.evaluation.mismatched && timingDeferred
      ? timing
      : null;
  const timingBlocks =
    timingMismatch !== null &&
    (timingMismatch.behavior === "block" ||
      timingMismatch.behavior === "redirect_confirm");

  const [redirectOpen, setRedirectOpen] = useState(false);
  const lastCheckedDate = useRef<string | null>(null);

  function handleEventDateChange(fieldKey: string, dateKey: string) {
    if (!timingRule || fieldKey !== timingRule.triggerField) return;
    if (timingRule.requireDocumentFirst) return;
    if (lastCheckedDate.current === dateKey) return;
    lastCheckedDate.current = dateKey;

    // Include the other answers: the window can depend on one of them (a
    // marriage with a license has a shorter on-time window).
    const evaluation = evaluateEventTiming(
      timingRule,
      { ...form.getValues(), [fieldKey]: dateKey },
      todayKeyInTimeZone(timingRule.timezone),
    );
    if (!evaluation.mismatched) return;
    if (evaluation.behavior === "auto_route") {
      handleSwitchTrack();
    } else if (evaluation.behavior === "redirect_confirm") {
      setRedirectOpen(true);
    }
  }

  function handleSwitchTrack() {
    if (!timingRule) return;
    const target = timingRule.targetServiceCode;
    const values = form.getValues();
    seedDraftForGroup(target, {
      answers: { ...draft.answers, ...values },
      eventDate: values.event_date ?? "",
      eventPlace: values.event_place ?? "",
      caseAnswers: caseAnswersFrom(values),
      presetMarital: draft.selectedServiceCode
        ? inferMaritalStatus(selectedService.name)
        : null,
      presetAge: ageInYears(values.event_date ?? "") >= 80 ? "80+" : "0-79",
    });
    const uploadDraftId = draft.uploadDraftId;
    clear();
    if (uploadDraftId) {
      discardRequestUploadDraftFn({ data: { uploadDraftId } }).catch(() => {});
    }
    setRedirectOpen(false);
    navigate({
      to: "/apply/$serviceCode/case",
      params: { serviceCode: target },
    });
  }

  function onSubmit(values: DynamicFieldValues) {
    update((previous) => {
      const answers = { ...previous.answers, ...values };
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
        answers,
        eventDate: values.event_date ?? previous.eventDate,
        eventPlace: values.event_place ?? previous.eventPlace,
        caseAnswers: caseAnswersFrom(values),
        documents: previous.documents.filter((document) =>
          visibleRequirementIds.has(document.requirementId),
        ),
      };
    });
    navigate({ to: "/apply/$serviceCode/details", params: { serviceCode } });
  }

  function handleServiceSelect(code: string) {
    const currentValues = form.getValues();
    update((previous) => {
      // CaseSelector publishes the new record type before resolving its service.
      // Do not restore the old form values after that change cleared the draft.
      const recordTypeChanged = previous.caseSelectorAnswers.record_type !== draft.caseSelectorAnswers.record_type;
      const answers = recordTypeChanged
        ? previous.answers
        : { ...previous.answers, ...currentValues };
      if (!code) {
        return {
          selectedServiceCode: null,
          answers,
        };
      }
      const answerBag = canonicalizeTemplateAnswers(definition, {
        ...previous.answers,
        ...watchedValues,
        ...previous.caseSelectorAnswers,
      });
      const visibleRequirementIds = new Set(
        requirements
          .filter((requirement) =>
            isRequirementApplicable(requirement, code, answerBag),
          )
          .map((requirement) => requirement.id),
      );
      return {
        selectedServiceCode: code,
        answers,
        documents: previous.documents.filter((document) =>
          visibleRequirementIds.has(document.requirementId),
        ),
      };
    });
  }

  return (
    <WizardShell step={1} title="Tell us about your request">
      <div className={isPetitionService(selectedService.service_code) ? "flex flex-col gap-6" : selectedService.service_code === "RA9255_SURNAME" ? "surname-change-case flex flex-col gap-6" : "flex flex-col gap-6"}>
        {isGroup ? (
          <CaseSelector
            services={services}
            selectedCode={draft.selectedServiceCode}
            onSelect={handleServiceSelect}
            definition={caseSelectorDefinition}
            answers={draft.caseSelectorAnswers}
            contextAnswers={selectorContextAnswers}
            showQuestionNumbers={!isDelayedBirth}
            hideBottomDivider={isDelayedBirth || onTimeBirth}
            hideTitle={onTimeBirth}
            renderAfterQuestion={isDelayedBirth ? (key) => key === "program" ? (
              <div className="w-full min-w-0 [&_fieldset]:min-w-0 [&_[data-slot=radio-group]]:min-w-0">
              <DynamicFormFields
                definition={{
                  ...caseDefinition,
                  sections: caseDefinition.sections.map((section) => ({
                    ...section,
                    fields: section.fields.filter((field) => field.key === "additional_identity"),
                  })),
                }}
                step="case"
                showRequiredMarks
                hideSectionTitles
                control={form.control}
                values={{ ...draft.caseSelectorAnswers, ...watchedValues }}
              />
              </div>
            ) : null : undefined}
            onAnswersChange={(caseSelectorAnswers) =>
              update((previous) => ({
                caseSelectorAnswers,
                answers: { ...previous.answers, ...form.getValues() },
              }))
            }
            presetAge={draft.presetAge}
            presetMarital={draft.presetMarital}
          />
        ) : null}

        {isDelayedBirth ? (
          <DynamicFormFields
            definition={questionDefinition}
            step="case"
            showRequiredMarks
            hideSectionTitles
            control={form.control}
            values={{ ...draft.caseSelectorAnswers, ...watchedValues }}
          />
        ) : null}

        <DynamicFormFields
          definition={requestDetailsDefinition}
          step="case"
          hideSectionTitles={isDelayedBirth || onTimeBirth || Boolean(caseSelectorDefinition?.questions.some((question) => question.key === "court_decree_type"))}
          sectionHeadingClassName={isPetitionService(selectedService.service_code) ? "mb-3" : undefined}
          showRequiredMarks
          control={form.control}
          // Case-selector answers can show or hide fields, so they take part in
          // visibility alongside the form's own values.
          values={{ ...draft.caseSelectorAnswers, ...watchedValues }}
          onDateChange={handleEventDateChange}
          // With the service questions above, head the fields as their own block.
          showSectionTitles={isGroup || isDelayedBirth}
        />

        {draft.selectedServiceCode && selectedService.fee_per_copy ? (
          <CopiesStepper
            wizard
            value={draft.copies}
            onChange={(copies) => update({ copies })}
            unitFee={selectedService.fee}
          />
        ) : null}

        <DerivedAnswerAlerts
          definition={definition}
          answers={derivedCaseAnswers}
          compact={selectedService.service_code === "MARRIAGE_LICENSE"}
        />

        {timingMismatch && timingRule ? (
          <EventTimingNotice
            behavior={timingRule.behavior}
            title={applicantCopy(timingRule.title)}
            description=""
            ctaLabel={timingRule.ctaLabel}
            onCta={() => setRedirectOpen(true)}
          />
        ) : null}

        {timingDeferredNotice ? (
          <NoticeAlert
            variant="default"
            role="status"
            icon={CalendarClock}
            title={applicantCopy(timingDeferredNotice.rule.title)}
          >{null}</NoticeAlert>
        ) : null}

        <WizardFooterActions
          onContinue={form.handleSubmit(onSubmit)}
          continueLabel="Next"
          continueReady={hasRequiredAnswers}
          continueDisabled={
            (isGroup && !draft.selectedServiceCode) ||
            timingBlocks ||
            Boolean(blockingAgeFeedback) ||
            Boolean(blockingOptionNotice)
          }
          note={
            blockingAgeFeedback
              ? selectedService.service_code === "MARRIAGE_LICENSE"
                ? blockingAgeFeedback.notice.title
                : blockingAgeFeedback.notice.description
              : blockingOptionNotice
                ? ["DEATH_DELAYED", "RA9255_SURNAME"].includes(selectedService.service_code)
                  ? undefined
                  : blockingOptionNotice.description
                : timingBlocks
                  ? "Update the date or switch services before continuing."
                  : undefined
          }
        />
      </div>

      <TrackRedirectDialog
        open={redirectOpen}
        onOpenChange={setRedirectOpen}
        title={timingRule ? trackRedirectCopy(timingRule).title : ""}
        description=""
        switchLabel={timingRule?.ctaLabel || "Switch service"}
        onKeepEditing={() => setRedirectOpen(false)}
        onSwitch={handleSwitchTrack}
        // Closing, by any route, puts the cursor back on the date.
        returnFocusTo={() =>
          timingRule ? document.getElementById(`dynamic-${timingRule.triggerField}`) : null
        }
      />
    </WizardShell>
  );
}
