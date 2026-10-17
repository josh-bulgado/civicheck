import { useNavigate } from "@tanstack/react-router";
import { QuietLink } from "~/components/quiet-link";
import { useMemo, useState, type ReactNode } from "react";
import { Check, CheckCircle2, Download } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { Button, buttonVariants } from "~/components/ui/button";
import { RequiredMark } from "~/components/ui/required-mark";
import {
  clampCopies,
  isRequirementApplicable,
} from "~/features/services/service-utils";
import {
  expandRequirementUploadSlots,
  requirementUploadKey,
} from "~/features/services/requirement-upload.utils";
import { submitRequestFn } from "~/features/services/services.mutations";
import { useAcknowledgmentPdfDownload } from "~/features/requests/pdf/useAcknowledgmentPdfDownload";
import type { AcknowledgmentPdfData } from "~/features/requests/pdf/types";
import type { ServiceDetail } from "~/features/services/services.queries";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
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
        <div className="flex flex-col items-start gap-5 rounded-[20px] border border-success/25 bg-success-soft-2 p-6">
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
              className="h-13 rounded-full px-6 text-base font-semibold"
              disabled={downloadingPdf}
              onClick={() => downloadAcknowledgmentPdf(result.pdfData)}
            >
              <Download data-icon="inline-start" />
              {downloadingPdf ? "Preparing PDF..." : "Download Acknowledgment PDF"}
            </Button>
            <QuietLink
              to="/my-requests"
              className={buttonVariants({
                size: "lg",
                className: "h-13 rounded-full px-6 text-base font-semibold",
              })}
            >
              View my requests
            </QuietLink>
          </div>
        </div>
      </WizardShell>
    );
  }

  // Everything the applicant said, in the two places they said it. The service
  // and its fee are in the docket above, so they are not repeated here.
  const caseQuestions = visibleCaseSelectorQuestions(definition, answerBag).map((question) => {
    const answer = answerBag[question.key];
    const value = typeof answer === "string" ? answer : "";
    return (
      <ReviewRow
        key={question.key}
        label={question.label}
        value={
          question.options.find((option) => option.value === value)?.label ?? (value || "—")
        }
      />
    );
  });

  const rowsForStep = (step: "case" | "details") =>
    definition.sections
      .filter((section) => (step === "case" ? section.step === "case" : section.step !== "case"))
      .flatMap((section) =>
        section.fields
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
                value={formatFieldAnswer(field, typeof answer === "string" ? answer : "")}
              />,
            ];
          }),
      );

  const caseRows = [...caseQuestions, ...rowsForStep("case")];
  const detailRows = rowsForStep("details");

  return (
    <WizardShell step={4} title="Check everything before you send" sidebar={<WhatHappensNextCard />}>
      <div className="flex flex-col gap-5">
        {caseRows.length > 0 ? (
          <ReviewBlock
            title="About your case"
            onEdit={() =>
              navigate({ to: "/apply/$serviceCode/case", params: { serviceCode } })
            }
          >
            {caseRows}
          </ReviewBlock>
        ) : null}

        {detailRows.length > 0 ? (
          <ReviewBlock
            title="Your details"
            onEdit={() =>
              navigate({ to: "/apply/$serviceCode/details", params: { serviceCode } })
            }
          >
            {detailRows}
          </ReviewBlock>
        ) : null}

        <ReviewBlock
          title="Documents"
          onEdit={() =>
            navigate({ to: "/apply/$serviceCode/documents", params: { serviceCode } })
          }
        >
          {activeDocuments.length === 0 ? (
            <p className="text-base text-muted-foreground sm:col-span-2">
              No documents uploaded yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3.5 sm:col-span-2">
              {activeDocumentsWithPositions.map(
                ({ document: doc, fileNumber, fileTotal }) => {
                  const name = doc.requirementName.replace(/\s*[—–]\s*/g, " - ");
                  const suffix = fileTotal > 1 ? ` · file ${fileNumber} of ${fileTotal}` : "";
                  return (
                    <div key={doc.storagePath} className="flex items-center gap-3.5">
                      <span className="flex size-5.5 shrink-0 items-center justify-center rounded-md bg-success text-primary-foreground">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      <DocumentPreview
                        fileName={doc.fileName}
                        url={previewUrls[doc.storagePath]}
                        label={`${name}${suffix}`}
                        onUrlError={() => refreshPreviewUrl(doc.storagePath)}
                      />
                      <span className="min-w-0 text-base leading-snug font-medium wrap-break-word text-foreground">
                        {doc.subjectRole ? `${doc.subjectRole}: ` : ""}
                        {name}
                        {suffix}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </ReviewBlock>

        <div className="flex items-start gap-3">
          <Checkbox
            id="confirm-application-details"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            className="mt-px size-6.5 rounded-lg border-[1.5px] border-dashed-border shadow-none data-checked:border-primary [&_svg]:size-4.5"
          />
          <label
            htmlFor="confirm-application-details"
            className="cursor-pointer text-base leading-[1.6] font-semibold text-foreground"
          >
            I confirm these details are correct. <RequiredMark />
          </label>
        </div>

        {submitError && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-[18px] bg-portal-danger-soft px-5 py-4"
          >
            <p className="text-[15px] leading-snug font-semibold text-destructive">
              {submitError}
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="civic-press h-12 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="civic-press rounded-full px-1 py-2 text-[15px] font-semibold text-body-2 hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <WizardFooterActions
        onBack={() =>
          navigate({ to: "/apply/$serviceCode/documents", params: { serviceCode } })
        }
        onContinue={handleSubmit}
        continueLabel="Submit request"
        pendingLabel="Submitting…"
        continueDisabled={!confirmed}
        continuePending={submitting}
      />
    </WizardShell>
  );
}

/** One of the review's three blocks: its name, an Edit link, and the answers in two columns. */
function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-border-light">
      <div className="flex items-center justify-between gap-3 bg-portal-panel px-5.5 py-3.5">
        <h2 className="text-[17px] leading-[normal] font-bold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          className="civic-press rounded-full px-1 py-1 text-[15px] font-semibold text-primary hover:text-primary-hover"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-1 gap-x-10 gap-y-3 px-5.5 py-4.5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-4 text-base">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-bold wrap-break-word text-foreground">
        {value}
      </span>
    </div>
  );
}

function WhatHappensNextCard() {
  return (
    <div className="overflow-hidden rounded-[24px] bg-card shadow-portal-card">
      <div className="border-b border-border-light px-5.5 py-4 text-[17px] font-bold text-foreground">
        What happens next
      </div>
      <ol className="flex flex-col gap-4 px-5.5 py-5">
        {[
          "Staff pre-check your uploads.",
          <>
            Visit the CCRO with your <strong className="font-bold">original documents</strong>.
          </>,
          "Show your tracking number.",
        ].map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">
              {index + 1}
            </span>
            <p className="pt-0.5 text-[15px] leading-snug text-body-strong">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
