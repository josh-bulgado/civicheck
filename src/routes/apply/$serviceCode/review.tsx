import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { formatFee } from "~/features/services/service-utils";
import { submitRequestFn } from "~/features/services/services.mutations";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/apply/$serviceCode/review")({
  component: ReviewStepRoute,
});

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

  const fullName = [
    draft.details.subjectFirstName,
    draft.details.subjectMiddleName,
    draft.details.subjectLastName,
    draft.details.subjectSuffix,
  ]
    .filter(Boolean)
    .join(" ");

  const sexLabel =
    draft.details.subjectSex === "male"
      ? "Male"
      : draft.details.subjectSex === "female"
        ? "Female"
        : "—";

  const finalPurpose =
    draft.caseAnswers.purpose === "Other"
      ? draft.caseAnswers.otherPurpose
      : draft.caseAnswers.purpose;

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
            subject_first_name: draft.details.subjectFirstName,
            subject_middle_name: draft.details.subjectMiddleName,
            subject_last_name: draft.details.subjectLastName,
            subject_suffix: draft.details.subjectSuffix,
            subject_sex: draft.details.subjectSex,
            contact_number: draft.details.contactNumber,
            event_date: draft.details.eventDate,
            event_place: draft.details.eventPlace,
            purpose: finalPurpose,
            additional_notes: draft.caseAnswers.additionalNotes,
          },
          documents: draft.documents.map((d) => ({
            requirementName: d.requirementName,
            fileUrl: d.storagePath,
          })),
        },
      });

      if (res.error) {
        setSubmitError(res.message || "Something went wrong. Please try again.");
        return;
      }

      setResult({ trackingNumber: res.trackingNumber!, documentWarning: res.documentWarning });
      clear();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
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
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
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
          title="Your details"
          onEdit={() =>
            navigate({ to: "/apply/$serviceCode/details", params: { serviceCode } })
          }
        >
          <ReviewRow label="Subject" value={fullName || "—"} />
          <ReviewRow label="Sex" value={sexLabel} />
          <ReviewRow
            label="Contact number"
            value={draft.details.contactNumber ? `+63 ${draft.details.contactNumber}` : "—"}
          />
        </EditSection>

        <EditSection
          title="About your case"
          onEdit={() =>
            navigate({ to: "/apply/$serviceCode/case", params: { serviceCode } })
          }
        >
          <ReviewRow label="Date of event" value={draft.details.eventDate || "—"} />
          <ReviewRow label="Place" value={draft.details.eventPlace || "—"} />
          <ReviewRow label="Purpose" value={finalPurpose || "—"} />
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
                    <Check className="size-2.5" />
                  </span>
                  <span className="text-foreground">
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

        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-relaxed text-body-strong">
            I confirm the details above are correct and I will bring the original documents.
          </span>
        </label>

        {submitError && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {submitError}
          </p>
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
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border-light">
      <div className="flex items-center justify-between gap-3 border-b border-border-light bg-background px-4.5 py-3">
        <span className="text-sm font-bold text-foreground">{title}</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-bold text-primary hover:text-primary-hover"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 px-4.5 py-3.5 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-bold text-foreground">{value}</span>
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
    <div className="overflow-hidden rounded-xl border border-border-strong bg-white">
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
