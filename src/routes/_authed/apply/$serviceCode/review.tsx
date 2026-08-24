import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { formatFee } from "~/features/services/service-utils";
import { submitRequestFn } from "~/features/services/services.mutations";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { ChangeServiceButton } from "~/features/apply/components/ApplicationDocket";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import { placeTypeLabel } from "~/lib/case-fields";
import { flattenSubjects, impliedSex, subjectFullName } from "~/lib/subject-fields";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/review")({
  component: ReviewStepRoute,
});

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

function ReviewStepRoute() {
  const { serviceCode } = Route.useParams();
  const navigate = useNavigate();
  const { displayName, services } = ApplyLayoutRoute.useLoaderData();
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

  const finalPurpose =
    draft.caseAnswers.purpose === "Other"
      ? draft.caseAnswers.otherPurpose
      : draft.caseAnswers.purpose;

  const dateLabel = selectedService?.event_date_label || "Date of event";
  const placeLabel = selectedService?.event_place_label || "Place of event";
  const referenceLabel = selectedService?.reference_number_label;
  const asksPurpose = selectedService?.asks_purpose ?? true;
  const asksBirthDetails = selectedService?.asks_birth_details ?? false;

  async function handleSubmit() {
    if (!selectedService) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitRequestFn({
        data: {
          serviceCode: selectedService.service_code,
          fee: Number(selectedService.fee),
          formData: {
            ...flattenSubjects(draft.subjects),
            contact_number: draft.contactNumber,
            event_date: draft.eventDate,
            event_place: draft.eventPlace,
            additional_notes: draft.caseAnswers.additionalNotes,
            ...(asksPurpose ? { purpose: finalPurpose } : {}),
            ...(referenceLabel
              ? { reference_number: draft.caseAnswers.referenceNumber }
              : {}),
            ...(asksBirthDetails
              ? {
                  place_type: draft.caseAnswers.placeType,
                  informant_name: draft.caseAnswers.informantName,
                  informant_relationship: draft.caseAnswers.informantRelationship,
                }
              : {}),
          },
          documents: draft.documents.map((d) => ({
            requirementName: d.requirementName,
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
        </EditSection>

        <EditSection
          title="Your details"
          onEdit={() =>
            navigate({ to: "/apply/$serviceCode/details", params: { serviceCode } })
          }
        >
          {draft.subjects.map((subject, index) => (
            <ReviewRow
              key={`name-${index}`}
              label={showRoleLabels ? subject.role : "Subject"}
              value={subjectFullName(subject) || "—"}
            />
          ))}
          {draft.subjects
            .filter((subject) => impliedSex(subject.role) === null)
            .map((subject, index) => (
              <ReviewRow
                key={`sex-${index}`}
                label={showRoleLabels ? `${subject.role}'s sex` : "Sex"}
                value={sexLabel(subject.sex)}
              />
            ))}
          <ReviewRow
            label="Contact number"
            value={draft.contactNumber ? `+63 ${draft.contactNumber}` : "—"}
          />
        </EditSection>

        <EditSection
          title="About your case"
          onEdit={() =>
            navigate({ to: "/apply/$serviceCode/case", params: { serviceCode } })
          }
        >
          <ReviewRow label={dateLabel} value={formatReviewDate(draft.eventDate)} />
          <ReviewRow label={placeLabel} value={draft.eventPlace || "—"} />
          {asksBirthDetails && (
            <>
              <ReviewRow
                label="Place type"
                value={placeTypeLabel(draft.caseAnswers.placeType)}
              />
              <ReviewRow
                label="Informant"
                value={draft.caseAnswers.informantName || "—"}
              />
              <ReviewRow
                label="Informant's relationship"
                value={draft.caseAnswers.informantRelationship || "—"}
              />
            </>
          )}
          {referenceLabel && (
            <ReviewRow
              label={referenceLabel}
              value={draft.caseAnswers.referenceNumber || "—"}
            />
          )}
          {asksPurpose && <ReviewRow label="Purpose" value={finalPurpose || "—"} />}
          <ReviewRow label="Notes" value={draft.caseAnswers.additionalNotes || "None"} />
        </EditSection>

        <EditSection
          title={`Documents · ${draft.documents.length} uploaded`}
          onEdit={() =>
            navigate({ to: "/apply/$serviceCode/documents", params: { serviceCode } })
          }
        >
          {draft.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {draft.documents.map((doc) => (
                <div key={doc.requirementId} className="flex items-center gap-2.5 text-sm">
                  <span className="flex size-4.5 shrink-0 items-center justify-center rounded-[5px] bg-success text-[10px] font-bold text-white">
                    <Check className="size-2.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 break-words text-foreground">
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
