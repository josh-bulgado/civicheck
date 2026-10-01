import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  File,
  FileText,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useAcknowledgmentPdfDownload } from "~/features/requests/pdf/useAcknowledgmentPdfDownload";
import { Input } from "~/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "~/components/ui/item";
import type { MyRequestDetail } from "~/features/requests/applicant-requests.queries";
import {
  getMyAttachmentSignedUrlFn,
  resubmitOwnAttachmentFn,
} from "~/features/requests/applicant-requests.mutations";
import { formatFee } from "~/features/services/service-utils";
import { staggerStyle } from "~/components/motion/stagger";
import { AttachmentGroups } from "~/features/requests/components/AttachmentGroups";
import { AttachmentViewerDialog } from "~/features/requests/components/AttachmentViewerDialog";
import { RequestDetailHero } from "~/features/requests/components/RequestDetailHero";
import { RequestHistoryTimeline } from "~/features/requests/components/RequestHistoryTimeline";
import { SubmittedDetailsCard } from "~/features/requests/components/SubmittedDetailsCard";

const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX_SIZE = 10 * 1024 * 1024;

function getAttachmentStatusVariant(
  status: string,
): "success" | "destructive" | "warning" {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "destructive";
    default:
      return "warning";
  }
}

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
      documents: request.attachments,
    });
  }

  return (
    <div className="dashboard-page">
      <Link
        to="/my-requests"
        className="group mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-1" />
        Back to my requests
      </Link>

      <RequestDetailHero
        trackingNumber={request.trackingNumber}
        status={request.status}
        paymentStatus={request.paymentStatus}
        feesDue={request.feesDue}
        subtitle={request.serviceName}
      >
        <Button
          size="sm"
          disabled={downloadingPdf}
          onClick={handleDownloadPdf}
          style={staggerStyle(2)}
        >
          <Download data-icon="inline-start" />
          {downloadingPdf ? "Preparing..." : "Download PDF"}
        </Button>
      </RequestDetailHero>

      <div className="civic-stagger mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div
          style={staggerStyle(0)}
          className="flex flex-col gap-6 lg:col-span-2"
        >
          <SubmittedDetailsCard request={request}>
            {request.feesDue > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="font-medium text-muted-foreground">Fees due</span>
                <span className="font-bold text-primary">
                  {formatFee(request.feesDue)} · pay at the CCRO cashier
                </span>
              </div>
            )}
          </SubmittedDetailsCard>

          <section className="dashboard-panel p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              Your documents ({request.attachments.length})
            </h2>
            {request.attachments.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Nothing was pre-uploaded for this request.
              </p>
            ) : (
              <ItemGroup className="civic-stagger-auto gap-3">
                <AttachmentGroups
                  docs={request.attachments}
                  renderRow={(doc, title) => (
                    <AttachmentRow
                      key={doc.id}
                      doc={doc}
                      title={title}
                      onChanged={onUpdated}
                    />
                  )}
                />
              </ItemGroup>
            )}
          </section>

          <RequestHistoryTimeline
            logs={request.logs}
            audience="applicant"
            feesDue={request.feesDue}
          />
        </div>

        <div style={staggerStyle(1)} className="flex flex-col gap-6">
          <section className="dashboard-panel p-6">
            <h2 className="mb-3 text-lg font-bold text-foreground">
              Processing time
            </h2>
            <p className="text-sm text-muted-foreground">
              {request.processingTime ||
                "Varies by document type — check with the CCRO."}
            </p>
          </section>

          {request.status === "ready_for_release" && (
            <section className="civic-enter-scale rounded-xl border border-success/25 bg-success-soft-2 p-6">
              <h2 className="mb-2 text-lg font-bold text-foreground">
                Ready for release
              </h2>
              <p className="text-sm text-muted-foreground">
                {request.feesDue <= 0
                  ? "No fee is due — claim your document at the CCRO."
                  : request.paymentStatus === "verified"
                    ? "Payment verified — claim your document at the CCRO."
                    : "Bring payment to the CCRO cashier to claim your document."}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

type AttachmentDoc = {
  id: string;
  requirementName: string;
  subjectRole: string | null;
  verificationStatus: string;
  rejectionReason: string | null;
};

function AttachmentRow({
  doc,
  title,
  onChanged,
}: {
  doc: AttachmentDoc;
  /** Overrides the requirement name, e.g. "File 2 of 3" inside a group. */
  title?: string;
  onChanged: () => void;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  async function handleViewFile() {
    setViewing(true);
    try {
      const res = await getMyAttachmentSignedUrlFn({
        data: { attachmentId: doc.id },
      });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      setViewerUrl(res.url);
    } finally {
      setViewing(false);
    }
  }

  async function handleFile(file: File) {
    if (!file.type || !ACCEPT.split(",").includes(file.type)) {
      toast.error("Only JPG, PNG, or PDF files are accepted.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Files must be 10 MB or smaller.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("attachmentId", doc.id);

      const res = await resubmitOwnAttachmentFn({ data: formData });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      toast.success("Document resubmitted for review.");
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Item variant="outline" className="rounded-lg border-border-light p-4">
        <ItemMedia variant="icon">
          <FileText className="size-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="font-semibold text-foreground">
            {title ??
              `${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${doc.requirementName}`}
          </ItemTitle>
          <Badge
            variant={getAttachmentStatusVariant(doc.verificationStatus)}
            className="w-fit capitalize"
          >
            {doc.verificationStatus}
          </Badge>
          {doc.verificationStatus === "rejected" && doc.rejectionReason && (
            <p className="text-xs text-destructive">{doc.rejectionReason}</p>
          )}
        </ItemContent>
        <ItemActions className="flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            disabled={viewing}
            onClick={handleViewFile}
          >
            <ExternalLink data-icon="inline-start" />
            View file
          </Button>
          {doc.verificationStatus === "rejected" && (
            <>
              <Input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                disabled={submitting}
                onClick={() => fileInput.current?.click()}
              >
                <Upload data-icon="inline-start" />
                {submitting ? "Uploading..." : "Resubmit"}
              </Button>
            </>
          )}
        </ItemActions>
      </Item>

      <AttachmentViewerDialog
        url={viewerUrl}
        subjectRole={doc.subjectRole}
        requirementName={doc.requirementName}
        onClose={() => setViewerUrl(null)}
      />
    </div>
  );
}
