import { Download, FileText, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import type { MyRequestDetail } from "~/features/requests/applicant-requests.queries";
import { SubmittedDetailsCard } from "~/features/requests/components/SubmittedDetailsCard";
import { formDataLabel, formatFormDataValue } from "~/features/requests/form-data-display";
import { groupFormData } from "~/features/requests/form-data-groups";
import { useAcknowledgmentPdfDownload } from "~/features/requests/pdf/useAcknowledgmentPdfDownload";

/** A few identifying answers, with the complete submitted form one click away. */
export function MyRequestSummary({ request }: { request: MyRequestDetail }) {
  const { download, downloading } = useAcknowledgmentPdfDownload();
  const groups = groupFormData(request.formData, (key) => formDataLabel(key, request));
  const people = groups.filter((group) => group.id.startsWith("party-"));
  const event = groups.find((group) => group.id === "event");
  const person = (index: number) => {
    const group = people[index];
    const name = group?.rows.find((row) => row.key.endsWith("_name"));
    return name ? { key: group.id, label: group.title, value: String(name.value) } : null;
  };
  const eventAnswer = (kind: "date" | "place") => {
    const row = event?.rows.find((answer) => answer.key.endsWith(`_${kind}`));
    return row ? { ...row, value: formatFormDataValue(row.key, row.value, request) } : null;
  };
  const highlights = [person(0), eventAnswer("date"), eventAnswer("place"), person(1)]
    .filter((item) => item !== null);
  const signature = request.formData.requester_signature;
  const hasSignature = typeof signature === "string" && signature.startsWith("data:image/png;base64,");
  const signedAt = typeof request.formData.requester_signed_at === "string"
    ? new Date(request.formData.requester_signed_at) : null;

  // Services without subject/event fields still get useful submitted answers.
  if (highlights.length === 0) {
    highlights.push(...groups.flatMap((group) => group.rows).slice(0, 3).map((row) => ({
      ...row, value: formatFormDataValue(row.key, row.value, request),
    })));
  }

  function handleDownloadPdf() {
    download({
      trackingNumber: request.trackingNumber,
      serviceName: request.serviceName,
      status: request.status,
      submittedAt: request.createdAt,
      feesDue: request.feesDue,
      processingTime: request.processingTime,
      departmentName: request.departmentName,
      documents: request.attachments,
    });
  }

  return (
    <section aria-labelledby="submitted-details-heading" className="flex min-w-0 flex-col gap-4 rounded-3xl border border-border-light bg-card p-5">
      <Dialog>
        <div className="flex items-center justify-between gap-2">
          <h2 id="submitted-details-heading" className="min-w-0 text-base font-semibold text-foreground">Submitted details</h2>
          <DialogTrigger render={<Button variant="secondary" size="sm" className="px-3 text-xs" />}>
            View full details
          </DialogTrigger>
        </div>
        <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[40rem]">
          <DialogHeader className="shrink-0 gap-2 border-b border-border-lighter px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-xl leading-6 font-semibold">Submitted details</DialogTitle>
              <DialogClose render={<Button variant="secondary" size="icon-sm" shape="soft" />}>
                <X aria-hidden="true" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
            <DialogDescription className="text-xs leading-4">
              All the information submitted with your application.
            </DialogDescription>
            <Badge variant="info" className="h-5 rounded-md px-2 font-mono text-[10px]">{request.trackingNumber}</Badge>
          </DialogHeader>
          <div role="region" aria-label="Submitted application information" tabIndex={0}
            className="min-h-0 overflow-y-auto overscroll-contain p-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <SubmittedDetailsCard request={request} showEmpty variant="dialog" bare />
            {hasSignature && (
              <section className="mt-4 border-t border-border-lighter pt-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Submitted signature</h3>
                <img src={signature} alt="Applicant's submitted signature" className="max-h-28 max-w-full rounded-lg border border-border-light bg-white p-3 object-contain" />
                {signedAt && !Number.isNaN(signedAt.getTime()) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Signed on <time dateTime={signedAt.toISOString()}>{signedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}</time>
                  </p>
                )}
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {highlights.length === 0 && <p className="text-sm text-muted-foreground">No applicant details were submitted.</p>}
      <dl className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-4">
        {highlights.map(({ key, label, value }) => (
          <div key={key} className="min-w-0">
            <dt className="text-[11px] leading-snug text-muted-foreground">{label}</dt>
            <dd className="mt-1 line-clamp-2 text-[13px] leading-snug font-semibold text-foreground wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="acknowledgment-slip-heading" className="border-t border-border-lighter pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FileText className="hidden size-4 shrink-0 text-primary min-[360px]:block" aria-hidden="true" />
            <h3 id="acknowledgment-slip-heading" className="min-w-0 text-xs font-semibold text-foreground wrap-anywhere min-[360px]:text-[13px]">Acknowledgment slip</h3>
          </div>
          <Button variant="link" size="touch" className="ml-auto px-0 text-xs" disabled={downloading} onClick={handleDownloadPdf}>
            <Download data-icon="inline-start" aria-hidden="true" />
            {downloading ? "Preparing..." : "Download PDF"}
          </Button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Save or print a copy with your tracking number and document checklist.
        </p>
      </section>
    </section>
  );
}
