import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
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
              to="/queue"
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Book a queue slot
            </Link>
            <Link
              to="/my-requests"
              className="inline-flex min-h-11 items-center rounded-lg border border-control-border bg-white px-5 text-sm font-semibold text-foreground hover:bg-background"
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
      title="Review and submit"
      description="Double check the details below. Payment is never collected online — you'll pay at the CCRO cashier."
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-foreground">Your request</h2>
          <div className="flex flex-col gap-3 divide-y divide-border-lighter text-sm">
            <div className="flex justify-between pb-3">
              <span className="text-muted-foreground">Service</span>
              <span className="font-semibold text-foreground">
                {selectedService?.name ?? displayName}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-semibold text-foreground">{fullName || "—"}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground">Event</span>
              <span className="font-semibold text-foreground">
                {draft.details.eventDate} · {draft.details.eventPlace}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground">Purpose</span>
              <span className="font-semibold text-foreground">{finalPurpose || "—"}</span>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-muted-foreground">Documents uploaded</span>
              <span className="font-semibold text-foreground">{draft.documents.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[10px] border border-border-light bg-white px-5 py-4.5">
          <div>
            <p className="text-sm text-muted-foreground">Total fees</p>
            <p className="text-xs text-body">Pay at the CCRO cashier</p>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {selectedService ? formatFee(selectedService.fee) : "—"}
          </p>
        </div>

        <div className="rounded-lg bg-primary-tint px-4 py-3.5 text-sm leading-relaxed text-body-strong">
          CiviCheck never collects payment online. Bring cash on your appointment date.
        </div>

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
        continuePending={submitting}
      />
    </WizardShell>
  );
}
