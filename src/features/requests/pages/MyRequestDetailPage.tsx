import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Upload } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { MyRequestDetail } from "~/features/requests/applicant-requests.queries";
import {
  getMyAttachmentSignedUrlFn,
  resubmitOwnAttachmentFn,
} from "~/features/requests/applicant-requests.mutations";
import {
  STAGE_LABELS,
  getPaymentDetails,
  getStatusDetails,
  stageOf,
} from "~/features/requests/request-workflow";
import { formatFee } from "~/features/services/service-utils";
import { staggerStyle } from "~/components/motion/stagger";

const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX_SIZE = 10 * 1024 * 1024;

function formatKey(key: string) {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * `event_date`/`event_place`/`reference_number` carry a per-service label
 * (e.g. "Date of birth" for a birth service) configured in Admin → Services —
 * show that instead of the generic humanized key when the service set one.
 */
function formDataLabel(key: string, request: MyRequestDetail) {
  if (key === "event_date" && request.eventDateLabel) return request.eventDateLabel;
  if (key === "event_place" && request.eventPlaceLabel) return request.eventPlaceLabel;
  if (key === "reference_number" && request.referenceNumberLabel) {
    return request.referenceNumberLabel;
  }
  return formatKey(key);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

export default function MyRequestDetailPage({ request, onUpdated }: MyRequestDetailPageProps) {
  const status = getStatusDetails(request.status);
  const payment = getPaymentDetails(request.paymentStatus);
  const stage = stageOf(request.status);

  return (
    <div className="dashboard-page">
      <Link
        to="/my-requests"
        className="group mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-1" />
        Back to my requests
      </Link>

      <header className="dashboard-hero">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
              {stage ? `Stage ${stage} · ${STAGE_LABELS[stage]}` : "Unknown stage"}
            </p>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white">
              {request.trackingNumber}
            </h1>
            <p className="mt-2 text-sm text-white/75">{request.serviceName}</p>
          </div>
          <div className="civic-stagger flex flex-wrap gap-2">
            <Badge
              variant={status.variant}
              style={staggerStyle(0)}
            >
              {status.label}
            </Badge>
            <Badge
              variant={payment.variant}
              style={staggerStyle(1)}
            >
              {payment.label}
            </Badge>
          </div>
        </div>
      </header>

      <div className="civic-stagger mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div style={staggerStyle(0)} className="flex flex-col gap-6 lg:col-span-2">
          <section className="dashboard-panel p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">Submitted details</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {Object.entries(request.formData).map(([key, value]) => {
                if (value == null || value === "") return null;
                return (
                  <div key={key}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {formDataLabel(key, request)}
                    </dt>
                    <dd className="text-sm text-foreground">
                      {key === "event_date"
                        ? new Date(value as string).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : String(value)}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {request.feesDue > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="font-medium text-muted-foreground">Fees due</span>
                <span className="font-bold text-primary">
                  {formatFee(request.feesDue)} · pay at the CCRO cashier
                </span>
              </div>
            )}
          </section>

          <section className="dashboard-panel p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              Your documents ({request.attachments.length})
            </h2>
            {request.attachments.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Nothing was pre-uploaded for this request.
              </p>
            ) : (
              <div className="civic-stagger-auto flex flex-col gap-3">
                {request.attachments.map((doc) => (
                  <AttachmentRow key={doc.id} doc={doc} onChanged={onUpdated} />
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-panel p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">Status history</h2>
            <ol className="civic-stagger-auto flex flex-col gap-4">
              {/* Document approvals and reversals are staff-side plumbing —
                  they don't move the request forward or ask the applicant to
                  do anything, so they'd just be noise here. A rejection
                  stays, since that's the applicant's cue to resubmit. */}
              {request.logs
                .filter(
                  (log) =>
                    log.actionStatus !== "document_approved" &&
                    log.actionStatus !== "document_reverted",
                )
                .map((log, index, visibleLogs) => {
                  const logStatus = getStatusDetails(log.actionStatus);
                  // Logs come back oldest-first, so the last entry is the
                  // request's current status — the one thing worth the eye
                  // landing on first in an otherwise-quiet gray timeline.
                  const isCurrent = index === visibleLogs.length - 1;
                  return (
                    <li key={log.id} className="flex gap-4">
                      <div
                        className={`shrink-0 rounded-full ${logStatus.dot} ${
                          isCurrent
                            ? "mt-1 size-3 ring-4 ring-primary/15"
                            : "mt-1.5 size-2"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {logStatus.label}
                        </p>
                        {log.remarks && (
                          <p className="text-sm text-muted-foreground">{log.remarks}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
            </ol>
          </section>
        </div>

        <div style={staggerStyle(1)} className="flex flex-col gap-6">
          <section className="dashboard-panel p-6">
            <h2 className="mb-3 text-lg font-bold text-foreground">Processing time</h2>
            <p className="text-sm text-muted-foreground">
              {request.processingTime || "Varies by document type — check with the CCRO."}
            </p>
          </section>

          {request.status === "ready_for_release" && (
            <section className="civic-enter-scale rounded-xl border border-success/25 bg-success-soft-2 p-6">
              <h2 className="mb-2 text-lg font-bold text-foreground">Ready for release</h2>
              <p className="text-sm text-muted-foreground">
                {request.paymentStatus === "verified"
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
  verificationStatus: string;
  rejectionReason: string | null;
};

function AttachmentRow({
  doc,
  onChanged,
}: {
  doc: AttachmentDoc;
  onChanged: () => void;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  async function handleViewFile() {
    setViewing(true);
    try {
      const res = await getMyAttachmentSignedUrlFn({ data: { attachmentId: doc.id } });
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
    <div className="flex flex-col gap-3 rounded-lg border border-border-light p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{doc.requirementName}</p>
          <Badge
            variant={getAttachmentStatusVariant(doc.verificationStatus)}
            className="mt-1 capitalize"
          >
            {doc.verificationStatus}
          </Badge>
          {doc.verificationStatus === "rejected" && doc.rejectionReason && (
            <p className="mt-1 text-xs text-destructive">{doc.rejectionReason}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" disabled={viewing} onClick={handleViewFile}>
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
        </div>
      </div>

      <Dialog open={viewerUrl != null} onOpenChange={(open) => !open && setViewerUrl(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{doc.requirementName}</DialogTitle>
          </DialogHeader>
          {viewerUrl && (
            <div className="flex max-h-[75vh] flex-col items-center overflow-auto">
              <iframe
                src={viewerUrl}
                title={doc.requirementName}
                className="h-[70vh] w-full rounded-md border border-border-light"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
