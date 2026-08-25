import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import {
  formatFee,
  isRequirementApplicable,
} from "~/features/services/service-utils";
import {
  expandRequirementUploadSlots,
  requirementUploadKey,
} from "~/features/services/requirement-upload.utils";
import { submitRequestFn } from "~/features/services/services.mutations";
import type { ServiceDetail } from "~/features/services/services.queries";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { ChangeServiceButton } from "~/features/apply/components/ApplicationDocket";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import {
  deriveTemplateAnswers,
  isFieldVisible,
  visibleCaseSelectorQuestions,
} from "~/features/forms/form-template.utils";
import type {
  FormFieldDefinition,
  TemplateAnswers,
} from "~/features/forms/form-template.types";
import { impliedSex, subjectFullName } from "~/lib/subject-fields";

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatReviewDate(value: string) {
  if (!value) return "—";
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? value : REVIEW_DATE_FORMATTER.format(date);
}

function formatFieldAnswer(field: FormFieldDefinition, value: string) {
  if (!value) return "—";
  if (field.type === "date") return formatReviewDate(value);
  if (field.type === "phone") return `+63 ${value}`;
  if (field.type === "select") {
    return field.options?.find((option) => option.value === value)?.label ?? value;
  }
  return value;
}

interface ReviewStepProps {
  serviceCode: string;
  displayName: ServiceDetail["displayName"];
  services: ServiceDetail["services"];
  requirements: ServiceDetail["requirements"];
}

export function ReviewStep({
  serviceCode,
  displayName,
  services,
  requirements,
}: ReviewStepProps) {
  const navigate = useNavigate();
  const { draft, clear } = useApplyDraft(serviceCode);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<{ trackingNumber: string; documentWarning?: string } | null>(
    null,
  );

  const selectedService = useMemo(
    () => services.find((s) => s.service_code === draft.selectedServiceCode) ?? services[0],
    [services, draft.selectedServiceCode],
  );

  const showRoleLabels = draft.subjects.length > 1;
  const sexLabel = (sex: string) =>
    sex === "male" ? "Male" : sex === "female" ? "Female" : "—";

  const definition = selectedService.form_template!.definition;
  const personGroupAnswers = Object.fromEntries(
    definition.sections
      .flatMap((section) => section.fields)
      .filter((field) => field.type === "person_group")
      .map((field) => [field.key, draft.subjects]),
  );
  const answerBag: TemplateAnswers = deriveTemplateAnswers(definition, {
    ...draft.answers,
    ...draft.caseSelectorAnswers,
    ...personGroupAnswers,
  });
  const activeDocumentKeys = new Set(
    expandRequirementUploadSlots(
      requirements.filter((requirement) =>
        isRequirementApplicable(
          requirement,
          selectedService.service_code,
          answerBag,
        ),
      ),
      draft.subjects,
    ).map((slot) => slot.key),
  );
  const activeDocuments = draft.documents.filter((document) =>
    activeDocumentKeys.has(
      requirementUploadKey(document.requirementId, document.subjectRole),
    ),
  );

  async function handleSubmit() {
    if (!selectedService) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitRequestFn({
        data: {
          serviceCode: selectedService.service_code,
          templateVersionId: selectedService.form_template?.versionId ?? null,
          answers: answerBag,
          documents: activeDocuments.map((d) => ({
            requirementId: d.requirementId,
            requirementName: d.requirementName,
            subjectRole: d.subjectRole,
            fileUrl: d.storagePath,
          })),
        },
      });

      if (res.error) {
        setSubmitError(
          res.message ||
            "The request could not be submitted. Review the details and try again.",
        );
        return;
      }

      setResult({ trackingNumber: res.trackingNumber!, documentWarning: res.documentWarning });
      clear();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "The request could not reach the CCRO service. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <WizardShell
        step={4}
        title="Request submitted"
        description="CCRO staff will pre-check your documents. You'll be notified in-system and by email as your request moves forward."
      >
        <div className="flex flex-col items-start gap-5 rounded-xl border border-success/25 bg-success-soft-2 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-8 text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Your tracking number</p>
              <p className="text-2xl font-bold text-foreground">{result.trackingNumber}</p>
            </div>
          </div>
          {result.documentWarning && (
            <p className="text-sm text-warning-strong">{result.documentWarning}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/my-requests"
              className={buttonVariants({ size: "lg" })}
            >
              View my requests
            </Link>
          </div>
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      step={4}
      title="Check everything before you send"
      description="Staff pre-check your file before you visit the CCRO counter. You can still edit any section."
      sidebar={<WhatHappensNextCard />}
    >
      <div className="flex flex-col gap-5">
        <EditSection
          title="Selected service"
          action={
            selectedService ? (
              <ChangeServiceButton
                serviceName={selectedService.name}
                onDiscard={clear}
                label="Change"
              />
            ) : null
          }
        >
          <ReviewRow
            label="Service"
            value={selectedService?.name ?? displayName}
          />
          {selectedService && selectedService.name !== displayName ? (
            <ReviewRow label="Service family" value={displayName} />
          ) : null}
          <ReviewRow
            label="Fee at cashier"
            value={selectedService ? formatFee(selectedService.fee) : "—"}
          />
          {visibleCaseSelectorQuestions(definition, answerBag).map(
            (question) => {
              const answer = answerBag[question.key];
              const value = typeof answer === "string" ? answer : "";
              return (
                <ReviewRow
                  key={question.key}
                  label={question.label}
                  value={
                    question.options.find((option) => option.value === value)
                      ?.label ?? (value || "—")
                  }
                />
              );
            },
          )}
        </EditSection>

        {definition.sections.map((section) => (
          <EditSection
            key={section.key}
            title={section.title}
            onEdit={() =>
              navigate({
                to:
                  section.step === "case"
                    ? "/apply/$serviceCode/case"
                    : "/apply/$serviceCode/details",
                params: { serviceCode },
              })
            }
          >
            {section.fields
              .filter((field) => isFieldVisible(field, answerBag))
              .flatMap((field) => {
                if (field.type === "person_group") {
                  return [
                    ...draft.subjects.map((subject, index) => (
                      <ReviewRow
                        key={`${field.key}-name-${index}`}
                        label={showRoleLabels ? subject.role : field.label}
                        value={subjectFullName(subject) || "—"}
                      />
                    )),
                    ...draft.subjects
                      .filter((subject) => impliedSex(subject.role) === null)
                      .map((subject, index) => (
                        <ReviewRow
                          key={`${field.key}-sex-${index}`}
                          label={showRoleLabels ? `${subject.role}'s sex` : "Sex"}
                          value={sexLabel(subject.sex)}
                        />
                      )),
                  ];
                }
                const answer = answerBag[field.key];
                return [
                  <ReviewRow
                    key={field.key}
                    label={field.label}
                    value={formatFieldAnswer(
                      field,
                      typeof answer === "string" ? answer : "",
                    )}
                  />,
                ];
              })}
          </EditSection>
        ))}

        <EditSection
          title={`Documents · ${activeDocuments.length} uploaded`}
          onEdit={() =>
            navigate({ to: "/apply/$serviceCode/documents", params: { serviceCode } })
          }
        >
          {activeDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeDocuments.map((doc) => (
                <div
                  key={`${doc.requirementId}-${doc.subjectRole ?? "request"}`}
                  className="flex items-center gap-2.5 text-sm"
                >
                  <span className="flex size-4.5 shrink-0 items-center justify-center rounded-[5px] bg-success text-[10px] font-bold text-white">
                    <Check className="size-2.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 break-words text-foreground">
                    {doc.subjectRole ? `${doc.subjectRole}: ` : ""}
                    {doc.requirementName} — {doc.fileName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </EditSection>

        <div className="flex items-center justify-between gap-5 rounded-[10px] border border-control-border bg-primary-tint px-4.5 py-4">
          <div>
            <p className="text-base font-bold text-foreground">Nothing is paid online</p>
            <p className="text-sm leading-relaxed text-body">
              Bring {selectedService ? formatFee(selectedService.fee) : "the fee"} in cash to the
              CCRO cashier when you visit.
            </p>
          </div>
          <p className="whitespace-nowrap text-2xl font-bold text-foreground">
            {selectedService ? formatFee(selectedService.fee) : "—"}
          </p>
        </div>

        <Field orientation="horizontal">
          <Checkbox
            id="confirm-application-details"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <FieldLabel htmlFor="confirm-application-details">
            I confirm the selected service and details above are correct, and I
            will bring the original documents.
          </FieldLabel>
        </Field>

        {submitError && (
          <Alert variant="destructive">
            <AlertTitle>Unable to submit request</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
      </div>

      <WizardFooterActions
        onBack={() =>
          navigate({ to: "/apply/$serviceCode/documents", params: { serviceCode } })
        }
        onContinue={handleSubmit}
        continueLabel="Submit request"
        continueDisabled={!confirmed}
        continuePending={submitting}
      />
    </WizardShell>
  );
}

function EditSection({
  title,
  onEdit,
  action,
  children,
}: {
  title: string;
  onEdit?: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border-light">
      <div className="flex items-center justify-between gap-3 border-b border-border-light bg-background px-4.5 py-3">
        <span className="text-sm font-bold text-foreground">{title}</span>
        {action ??
          (onEdit ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onEdit}
            >
              Edit
            </Button>
          ) : null)}
      </div>
      <div className="grid grid-cols-1 gap-2.5 px-4.5 py-3.5 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-bold text-foreground">
        {value}
      </span>
    </div>
  );
}

function WhatHappensNextCard() {
  const steps = [
    "Staff pre-check your uploads within 1 working day.",
    "Visit the CCRO counter with your original documents — no appointment needed.",
    "Present your tracking number at the counter when you arrive.",
  ];
  return (
    <div className="civic-card overflow-hidden">
      <div className="border-b border-border-light px-4.5 py-3.5 text-base font-bold text-foreground">
        What happens next
      </div>
      <div className="flex flex-col gap-3.5 px-4.5 py-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
              {index + 1}
            </span>
            <p className="text-sm leading-relaxed text-body-strong">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
