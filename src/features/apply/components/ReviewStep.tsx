import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, CheckCircle2, Download } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { RequiredMark } from "~/components/ui/required-mark";
import {
  parseFeeComponents,
  splitFeeComponents,
  type FeeComponent,
} from "~/features/services/fee-components";
import {
  clampCopies,
  formatFee,
  formatPesoFee,
  isRequirementApplicable,
  totalFee,
} from "~/features/services/service-utils";
import {
  expandRequirementUploadSlots,
  requirementUploadKey,
} from "~/features/services/requirement-upload.utils";
import { submitRequestFn } from "~/features/services/services.mutations";
import { useAcknowledgmentPdfDownload } from "~/features/requests/pdf/useAcknowledgmentPdfDownload";
import type { AcknowledgmentPdfData } from "~/features/requests/pdf/types";
import { discardRequestUploadDraftFn } from "~/features/apply/apply.mutations";
import type { ServiceDetail } from "~/features/services/services.queries";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { ChangeServiceButton } from "~/features/apply/components/ApplicationDocket";
import { DocumentPreview } from "~/features/apply/components/DocumentPreview";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import { useDocumentPreviewUrls } from "~/features/apply/hooks/useDocumentPreviewUrls";
import {
  canonicalizeTemplateAnswers,
  isFieldVisible,
  visibleCaseSelectorQuestions,
} from "~/features/forms/form-template.utils";
import { formatFieldAnswer } from "~/features/forms/answer-format";
import type { TemplateAnswers } from "~/features/forms/form-template.types";
import {
  impliedSex,
  reconcileSubjects,
  subjectFullName,
} from "~/lib/subject-fields";

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
  const [result, setResult] = useState<{
    trackingNumber: string;
    documentWarning?: string;
    pdfData: AcknowledgmentPdfData;
  } | null>(null);
  const { download: downloadAcknowledgmentPdf, downloading: downloadingPdf } =
    useAcknowledgmentPdfDownload();

  function handleDiscard() {
    const uploadDraftId = draft.uploadDraftId;
    clear();
    if (uploadDraftId) {
      discardRequestUploadDraftFn({ data: { uploadDraftId } }).catch(() => {});
    }
  }

  const selectedService = useMemo(
    () => services.find((s) => s.service_code === draft.selectedServiceCode) ?? services[0],
    [services, draft.selectedServiceCode],
  );
  const roles = selectedService?.party_roles?.length
    ? selectedService.party_roles
    : ["Subject"];
  // Also normalize here so drafts saved before this fix can be submitted
  // directly from the review page without making the applicant re-enter data.
  const subjects = reconcileSubjects(draft.subjects, roles);

  // Mirrors the server: quantity only counts for a per-copy service, and the
  // server recomputes the same total on submit.
  const feePerCopy = selectedService?.fee_per_copy === true;
  const copies = feePerCopy ? clampCopies(draft.copies) : 1;
  const feeDueLabel = selectedService
    ? formatFee(totalFee(selectedService.fee, copies, feePerCopy))
    : "—";
  // The itemized charges behind the total. A per-copy service already shows
  // "N × ₱X per copy" above, so it never carries a breakdown of its own.
  const { included: feeParts, alsoPayable } = splitFeeComponents(
    feePerCopy ? [] : parseFeeComponents(selectedService?.fee_components),
  );
  const feeLines: FeeComponent[] =
    feeParts.length > 0
      ? feeParts
      : selectedService
        ? [
            {
              label: "Service fee",
              amount: totalFee(selectedService.fee, copies, feePerCopy),
              included: true,
            },
          ]
        : [];
  const showFeeBreakdown = feeParts.length > 1 || alsoPayable.length > 0;

  const showRoleLabels = subjects.length > 1;
  const sexLabel = (sex: string) =>
    sex === "male" ? "Male" : sex === "female" ? "Female" : "—";

  const definition = selectedService.form_template!.definition;
  const personGroupAnswers = Object.fromEntries(
    definition.sections
      .flatMap((section) => section.fields)
      .filter((field) => field.type === "person_group")
      .map((field) => [field.key, subjects]),
  );
  const answerBag: TemplateAnswers = canonicalizeTemplateAnswers(definition, {
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
      subjects,
    ).map((slot) => slot.key),
  );
  const activeDocuments = draft.documents.filter((document) =>
    activeDocumentKeys.has(
      requirementUploadKey(document.requirementId, document.subjectRole),
    ),
  );
  const { urls: previewUrls, refresh: refreshPreviewUrl } =
    useDocumentPreviewUrls(
      draft.uploadDraftId,
      activeDocuments.map((document) => document.storagePath),
    );
  const documentTotals = new Map<string, number>();
  for (const document of activeDocuments) {
    const key = requirementUploadKey(
      document.requirementId,
      document.subjectRole,
    );
    documentTotals.set(key, (documentTotals.get(key) ?? 0) + 1);
  }
  const documentPositions = new Map<string, number>();
  const activeDocumentsWithPositions = activeDocuments.map((document) => {
    const key = requirementUploadKey(
      document.requirementId,
      document.subjectRole,
    );
    const fileNumber = (documentPositions.get(key) ?? 0) + 1;
    documentPositions.set(key, fileNumber);
    return {
      document,
      fileNumber,
      fileTotal: documentTotals.get(key) ?? 1,
    };
  });

  async function handleSubmit() {
    if (!selectedService) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitRequestFn({
        data: {
          serviceCode: selectedService.service_code,
          templateVersionId: selectedService.form_template?.versionId ?? null,
          uploadDraftId: draft.uploadDraftId,
          answers: answerBag,
          copies: feePerCopy ? copies : undefined,
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

      setResult({
        trackingNumber: res.trackingNumber!,
        documentWarning: res.documentWarning,
        pdfData: res.pdfData!,
      });
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
            <Button
              size="lg"
              variant="outline"
              disabled={downloadingPdf}
              onClick={() => downloadAcknowledgmentPdf(result.pdfData)}
            >
              <Download data-icon="inline-start" />
              {downloadingPdf ? "Preparing PDF..." : "Download Acknowledgment PDF"}
            </Button>
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
                onDiscard={handleDiscard}
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
          {feePerCopy && selectedService ? (
            <ReviewRow
              label="Number of copies"
              value={`${copies} × ${formatPesoFee(selectedService.fee)} per copy`}
            />
          ) : null}
          <ReviewRow label="Fee at cashier" value={feeDueLabel} />
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
                    ...subjects.map((subject, index) => (
                      <ReviewRow
                        key={`${field.key}-name-${index}`}
                        label={showRoleLabels ? subject.role : field.label}
                        value={subjectFullName(subject) || "—"}
                      />
                    )),
                    ...subjects
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
            <p className="text-sm text-muted-foreground sm:col-span-2">No documents uploaded yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5 sm:col-span-2">
              {activeDocumentsWithPositions.map(
                ({ document: doc, fileNumber, fileTotal }) => (
                  <div
                    key={doc.storagePath}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-[5px] bg-success text-[10px] font-bold text-white">
                      <Check className="size-2.5" aria-hidden="true" />
                    </span>
                    <DocumentPreview
                      fileName={doc.fileName}
                      url={previewUrls[doc.storagePath]}
                      label={`${doc.requirementName.replace(/\s*[—–]\s*/g, " - ")}${
                        fileTotal > 1 ? ` · file ${fileNumber} of ${fileTotal}` : ""
                      }`}
                      onUrlError={() => refreshPreviewUrl(doc.storagePath)}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="wrap-break-word text-foreground">
                        {doc.subjectRole ? `${doc.subjectRole}: ` : ""}
                        {doc.requirementName.replace(/\s*[—–]\s*/g, " - ")}
                        {fileTotal > 1
                          ? ` · file ${fileNumber} of ${fileTotal}`
                          : ""}
                      </span>
                      <span
                        className="truncate text-xs text-muted-foreground"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </span>
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </EditSection>

        <div className="rounded-[10px] border border-border-light bg-primary-tint px-4.5 py-4">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-base font-bold text-foreground">Nothing is paid online</p>
              <p className="text-sm leading-relaxed text-body">
                Bring {selectedService ? feeDueLabel : "the fee"} in cash to the
                CCRO cashier when you visit.
              </p>
            </div>
            <p className="whitespace-nowrap text-2xl font-bold text-foreground">
              {feeDueLabel}
            </p>
          </div>
          {showFeeBreakdown ? (
            <div className="mt-3.5 flex flex-col gap-3.5 border-t border-border-light pt-3.5">
              <FeeLines title="What the fee covers" lines={feeLines} />
              {alsoPayable.length > 0 ? (
                <FeeLines
                  title="Also payable, not in the amount above"
                  lines={alsoPayable}
                  muted
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <Field orientation="horizontal">
          <Checkbox
            id="confirm-application-details"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <FieldLabel
            htmlFor="confirm-application-details"
            className="text-[15px] leading-snug font-semibold"
          >
            <span>
              I confirm the selected service and details above are correct, and
              I will bring the original documents. <RequiredMark />
            </span>
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
        <span className="text-[15px] font-bold text-foreground">{title}</span>
        {action ??
          (onEdit ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-[15px] font-semibold hover:text-primary-hover"
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

function FeeLines({
  title,
  lines,
  muted = false,
}: {
  title: string;
  lines: FeeComponent[];
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      <dl className="flex flex-col gap-1.5">
        {lines.map((line, index) => (
          <div
            // Labels are admin-authored and may repeat, so the position is part of the key.
            key={`${line.label}-${index}`}
            className="flex justify-between gap-3 text-[15px]"
          >
            <dt className={muted ? "text-muted-foreground" : "text-body"}>
              {line.label}
            </dt>
            <dd
              className={`shrink-0 tabular-nums ${
                muted ? "text-muted-foreground" : "font-semibold text-foreground"
              }`}
            >
              {formatPesoFee(line.amount)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 text-[15px]">
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
    <div className="portal-card overflow-hidden">
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
