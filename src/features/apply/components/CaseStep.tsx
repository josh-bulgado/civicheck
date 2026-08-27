import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { CalendarClock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { BirthTrackRedirectDialog } from "~/features/apply/components/BirthTrackRedirectDialog";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import {
  DynamicFormFields,
  type DynamicFieldValues,
} from "~/features/forms/components/DynamicFormFields";
import { DerivedAnswerAlerts } from "~/features/forms/components/DerivedAnswerAlerts";
import {
  deriveTemplateAnswers,
  fieldsForStep,
  getDerivedAnswerFeedback,
} from "~/features/forms/form-template.utils";
import { isRequirementApplicable } from "~/features/services/service-utils";
import type { ServiceDetail } from "~/features/services/services.queries";
import {
  seedDraftForGroup,
  useApplyDraft,
} from "~/features/apply/hooks/useApplyDraft";
import { discardRequestUploadDraftFn } from "~/features/apply/apply.mutations";
import { ageInYears, diffInDays, toDateKey } from "~/lib/date";
import {
  CaseSelector,
  inferMaritalStatus,
} from "~/features/services/components/CaseSelector";

const ON_TIME_WINDOW_DAYS = 30;
const MARRIAGE_LICENSE_CODE = "MARRIAGE_LICENSE";
const MARRIAGE_NOTICE_DAYS = 10;
const RECOMMENDED_MARRIAGE_LEAD_DAYS = 21;
const OPPOSITE_BIRTH_GROUP: Record<string, string> = {
  birth_ontime: "birth_delayed",
  birth_delayed: "birth_ontime",
};

type RedirectDirection = "toDelayed" | "toOnTime";

function mismatchDirection(
  dateKey: string,
  birthGroup: string | null,
): RedirectDirection | null {
  if (!dateKey || !birthGroup) return null;
  const daysAgo = diffInDays(dateKey, toDateKey());
  if (birthGroup === "birth_ontime" && daysAgo > ON_TIME_WINDOW_DAYS) {
    return "toDelayed";
  }
  if (
    birthGroup === "birth_delayed" &&
    daysAgo >= 0 &&
    daysAgo <= ON_TIME_WINDOW_DAYS
  ) {
    return "toOnTime";
  }
  return null;
}

function formatLeadTime(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "1 day away";
  return `${days} days away`;
}

function getMarriageTimingNotice(serviceCode: string | undefined, intendedDate: string) {
  if (serviceCode !== MARRIAGE_LICENSE_CODE || !intendedDate) return null;
  const daysUntilMarriage = diffInDays(toDateKey(), intendedDate);
  if (daysUntilMarriage < 0) return null;

  if (daysUntilMarriage <= MARRIAGE_NOTICE_DAYS) {
    return {
      title: "Your intended marriage date is too soon",
      description: `This date is ${formatLeadTime(daysUntilMarriage)}. A marriage license is issued only after the required 10-day public-notice period, and you must first attend the scheduled family-planning and pre-marriage counseling session. Choose a later date; planning at least 3 weeks ahead is safer.`,
    };
  }
  if (daysUntilMarriage < RECOMMENDED_MARRIAGE_LEAD_DAYS) {
    return {
      title: "Allow more time before the wedding",
      description: `This date is ${formatLeadTime(daysUntilMarriage)}. The schedule may be tight after the family-planning and pre-marriage counseling session, document processing, and the required 10-day public-notice period. Planning at least 3 weeks ahead is safer.`,
    };
  }
  return null;
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
  const selectedService =
    services.find((service) => service.service_code === draft.selectedServiceCode) ??
    services[0];
  const definition = selectedService.form_template!.definition;
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

  const birthGroup = services[0]?.display_group ?? null;
  const targetBirthGroup = selectedService.asks_birth_details
    ? (OPPOSITE_BIRTH_GROUP[birthGroup ?? ""] ?? null)
    : null;

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
  const derivedCaseAnswers = deriveTemplateAnswers(definition, {
    ...draft.answers,
    ...watchedValues,
    ...draft.caseSelectorAnswers,
  });
  const selectorContextAnswers = Object.fromEntries(
    Object.entries(derivedCaseAnswers).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
  const blockingAgeFeedback = getDerivedAnswerFeedback(
    definition,
    derivedCaseAnswers,
  ).find((feedback) => feedback.notice.blocksProgress);
  const watchedEventDate = watchedValues.event_date ?? "";
  const marriageTimingNotice = getMarriageTimingNotice(
    selectedService.service_code,
    watchedEventDate,
  );
  const currentMismatch = targetBirthGroup
    ? mismatchDirection(watchedEventDate, birthGroup)
    : null;

  const [redirectDirection, setRedirectDirection] =
    useState<RedirectDirection | null>(null);
  const lastCheckedDate = useRef<string | null>(null);

  function checkBirthTrack(fieldKey: string, dateKey: string) {
    if (fieldKey !== "event_date" || lastCheckedDate.current === dateKey) return;
    lastCheckedDate.current = dateKey;
    const direction = mismatchDirection(dateKey, birthGroup);
    if (direction) setRedirectDirection(direction);
  }

  function handleSwitchTrack() {
    if (!targetBirthGroup) return;
    const values = form.getValues();
    seedDraftForGroup(targetBirthGroup, {
      answers: { ...draft.answers, ...values },
      eventDate: values.event_date ?? "",
      eventPlace: values.event_place ?? "",
      caseAnswers: {
        purpose: values.purpose ?? "",
        otherPurpose: values.purpose_other ?? "",
        additionalNotes: values.additional_notes ?? "",
        referenceNumber: values.reference_number ?? "",
        placeType: values.place_type ?? "",
        informantName: values.informant_name ?? "",
        informantRelationship: values.informant_relationship ?? "",
      },
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
    setRedirectDirection(null);
    navigate({
      to: "/apply/$serviceCode/case",
      params: { serviceCode: targetBirthGroup },
    });
  }

  function onSubmit(values: DynamicFieldValues) {
    update((previous) => {
      const answers = { ...previous.answers, ...values };
      const answerBag = deriveTemplateAnswers(definition, {
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
        eventDate: values.event_date ?? "",
        eventPlace: values.event_place ?? "",
        caseAnswers: {
          purpose: values.purpose ?? "",
          otherPurpose: values.purpose_other ?? "",
          additionalNotes: values.additional_notes ?? "",
          referenceNumber: values.reference_number ?? "",
          placeType: values.place_type ?? "",
          informantName: values.informant_name ?? "",
          informantRelationship: values.informant_relationship ?? "",
        },
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
      if (!code) {
        return {
          selectedServiceCode: null,
          answers: { ...previous.answers, ...currentValues },
        };
      }
      const answerBag = deriveTemplateAnswers(definition, {
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
        answers: { ...previous.answers, ...currentValues },
        documents: previous.documents.filter((document) =>
          visibleRequirementIds.has(document.requirementId),
        ),
      };
    });
  }

  return (
    <WizardShell
      step={1}
      title="Tell us about your case"
      description="A few quick questions to find the right service and get the details of your case."
    >
      <div className="flex flex-col gap-6">
        {isGroup ? (
          <CaseSelector
            services={services}
            selectedCode={draft.selectedServiceCode}
            onSelect={handleServiceSelect}
            definition={caseSelectorDefinition}
            answers={draft.caseSelectorAnswers}
            contextAnswers={selectorContextAnswers}
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

        <DynamicFormFields
          definition={definition}
          step="case"
          control={form.control}
          values={watchedValues}
          onDateChange={checkBirthTrack}
        />

        <DerivedAnswerAlerts
          definition={definition}
          answers={derivedCaseAnswers}
        />

        {marriageTimingNotice ? (
          <Alert variant="warning" role="status" aria-live="polite">
            <CalendarClock aria-hidden="true" />
            <AlertTitle>{marriageTimingNotice.title}</AlertTitle>
            <AlertDescription>{marriageTimingNotice.description}</AlertDescription>
          </Alert>
        ) : null}

        {currentMismatch ? (
          <Alert variant="warning">
            <AlertTitle>
              {currentMismatch === "toDelayed"
                ? "This date is more than 30 days ago"
                : "This date is within the last 30 days"}
            </AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              Use the registration track that matches the birth date.
              <Button type="button" variant="outline" size="sm" onClick={handleSwitchTrack}>
                Switch to {currentMismatch === "toDelayed" ? "Delayed" : "On-Time"} Registration
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <WizardFooterActions
          onContinue={form.handleSubmit(onSubmit)}
          continueLabel="Continue to your details"
          continueDisabled={
            (isGroup && !draft.selectedServiceCode) ||
            currentMismatch !== null ||
            Boolean(blockingAgeFeedback)
          }
          note={
            blockingAgeFeedback
              ? blockingAgeFeedback.notice.description
              : currentMismatch
                ? "Resolve the date above before continuing."
                : undefined
          }
        />
      </div>

      <BirthTrackRedirectDialog
        open={redirectDirection !== null}
        onOpenChange={(open) => !open && setRedirectDirection(null)}
        direction={redirectDirection}
        onKeepEditing={() => setRedirectDirection(null)}
        onSwitch={handleSwitchTrack}
      />
    </WizardShell>
  );
}
