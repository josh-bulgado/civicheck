import { Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import { staggerStyle } from "~/components/motion/stagger";
import { useAcknowledgmentPdfDownload } from "~/features/requests/pdf/useAcknowledgmentPdfDownload";
import type { MyRequestDetail } from "~/features/requests/applicant-requests.queries";
import { formatFee } from "~/features/services/service-utils";
import { MyRequestDocumentsCard } from "~/features/requests/components/MyRequestDocumentsCard";
import { MyRequestHeader } from "~/features/requests/components/MyRequestHeader";
import { NextStepsCard } from "~/features/requests/components/NextStepsCard";
import { RequestMessagesCard } from "~/features/requests/components/RequestMessagesCard";
import { RequestStatusHistory } from "~/features/requests/components/RequestStatusHistory";
import { SubmittedDetailsCard } from "~/features/requests/components/SubmittedDetailsCard";
import { nextSteps } from "~/features/requests/next-steps";

interface MyRequestDetailPageProps {
  request: MyRequestDetail;
  /** Called after a mutation succeeds, so the route can re-run its loader. */
  onUpdated: () => void;
}

export default function MyRequestDetailPage({
  request,
  onUpdated,
}: MyRequestDetailPageProps) {
  const { download: downloadAcknowledgmentPdf, downloading: downloadingPdf } =
    useAcknowledgmentPdfDownload();

  function handleDownloadPdf() {
    downloadAcknowledgmentPdf({
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

  const next = nextSteps({
    status: request.status,
    paymentStatus: request.paymentStatus,
    feesDue: request.feesDue,
    allowsMessages: request.allowsMessages,
    attachments: request.attachments,
    logs: request.logs,
  });

  return (
    <div className="portal-page gap-6 md:gap-7">
      <MyRequestHeader
        serviceName={request.serviceName}
        trackingNumber={request.trackingNumber}
        status={request.status}
      />

      <div className="civic-stagger grid grid-cols-1 items-start gap-6 md:gap-7 lg:grid-cols-[minmax(0,1fr)_30rem]">
        <div style={staggerStyle(0)} className="flex flex-col gap-6 md:gap-7">
          <NextStepsCard status={request.status} next={next} />
          <RequestStatusHistory logs={request.logs} />
        </div>

        <div style={staggerStyle(1)} className="flex flex-col gap-6">
          {request.allowsMessages && (
            <RequestMessagesCard
              requestId={request.id}
              messages={request.messages}
              viewer="applicant"
              onSent={onUpdated}
              variant="portal"
            />
          )}

          <SubmittedDetailsCard request={request} variant="portal">
            <dl className="mt-5 flex flex-col divide-y divide-border-lighter border-t border-border-lighter text-[17px]">
              {request.feesDue > 0 && (
                <div className="flex items-baseline justify-between gap-4 py-3.5">
                  <dt className="text-muted-foreground">
                    Fees due
                    {request.copies > 1 ? ` (${request.copies} copies)` : ""}
                  </dt>
                  <dd className="text-right font-semibold text-foreground">
                    {formatFee(request.feesDue)}
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 py-3.5 last:pb-0">
                <dt className="text-muted-foreground">Processing time</dt>
                <dd className="text-right font-semibold text-foreground">
                  {request.processingTime ||
                    "Varies by document type — check with the CCRO."}
                </dd>
              </div>
            </dl>
          </SubmittedDetailsCard>

          <section className="flex items-center gap-4 rounded-[28px] bg-card p-6 shadow-portal-card ring-2 ring-border-light md:p-7">
            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] leading-[normal] font-semibold text-foreground">
                Acknowledgment slip
              </h2>
              <p className="mt-1.5 text-[15px] leading-[1.45] text-muted-foreground">
                A PDF with your tracking number, fees and document list. Save it or
                print it to bring along.
              </p>
            </div>
            <Button
              className="h-11.5 shrink-0 rounded-full bg-primary-soft px-5 text-[15px] font-semibold text-primary hover:bg-primary-soft/70"
              disabled={downloadingPdf}
              onClick={handleDownloadPdf}
            >
              <Download data-icon="inline-start" aria-hidden="true" />
              {downloadingPdf ? "Preparing..." : "Download PDF"}
            </Button>
          </section>

          <MyRequestDocumentsCard documents={request.attachments} onChanged={onUpdated} />
        </div>
      </div>
    </div>
  );
}
