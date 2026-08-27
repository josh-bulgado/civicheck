import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  File,
  FileText,
  Image as ImageIcon,
  XCircle,
} from "lucide-react";
import { usePermissions } from "~/hooks/usePermissions";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "~/components/ui/item";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "~/components/reui/timeline";
import type { RequestDetail } from "~/features/requests/requests.queries";
import {
  advanceRequestStatusFn,
  getAttachmentSignedUrlFn,
  revertAttachmentVerificationFn,
  setAttachmentVerificationFn,
} from "~/features/requests/requests.mutations";
import { PaymentVerificationPanel } from "~/features/requests/components/PaymentVerificationPanel";
import {
  REASON_REQUIRED,
  STAGE_LABELS,
  TRANSITION_LABELS,
  getPaymentDetails,
  getStatusDetails,
  nextStatuses,
  stageOf,
  type RequestStatus,
} from "~/features/requests/request-workflow";
import { staggerStyle } from "~/components/motion/stagger";

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
function formDataLabel(key: string, request: RequestDetail) {
  if (request.fieldLabels[key]) return request.fieldLabels[key];
  if (key === "event_date" && request.eventDateLabel)
    return request.eventDateLabel;
  if (key === "event_place" && request.eventPlaceLabel)
    return request.eventPlaceLabel;
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

interface RequestDetailPageProps {
  request: RequestDetail;
  /** Called after a mutation succeeds, so the route can re-run its loader. */
  onUpdated: () => void;
}

export default function RequestDetailPage({
  request,
  onUpdated,
}: RequestDetailPageProps) {
  const { can } = usePermissions();

  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  const status = getStatusDetails(request.status);
  const payment = getPaymentDetails(request.paymentStatus);
  const stage = stageOf(request.status);
  const available = nextStatuses(request.status);

  const canProcess = can("requests:process");
  const canReverseVerification = can("requests:reverse_verification");
  const hasUnresolvedAttachments = request.attachments.some(
    (doc) => doc.verificationStatus !== "approved",
  );
  const visibleTransitions = available.filter((s) => {
    if (s === "processing" && hasUnresolvedAttachments) return false;
    return true;
  });
  const needsAttachmentsResolved =
    available.includes("processing") && hasUnresolvedAttachments;

  async function handleTransition(to: RequestStatus) {
    if (REASON_REQUIRED.includes(to) && !remarks.trim()) {
      toast.error("Give the applicant a reason first.", {
        description: "Fill in the remarks box below before this decision.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await advanceRequestStatusFn({
        data: { requestId: request.id, toStatus: to, remarks },
      });
      if (res.error) {
        toast.error("Could not update this request", {
          description: res.message,
        });
        return;
      }
      toast.success(`Moved to ${getStatusDetails(to).label}`);
      setRemarks("");
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function handleAttachmentDecision(
    attachmentId: string,
    status: "approved" | "rejected",
    reason?: string,
  ) {
    const res = await setAttachmentVerificationFn({
      data: { attachmentId, status, reason },
    });
    if (res.error) {
      toast.error(res.message);
      return false;
    }
    onUpdated();
    return true;
  }

  async function handleAttachmentRevert(attachmentId: string, reason: string) {
    const res = await revertAttachmentVerificationFn({
      data: { attachmentId, reason },
    });
    if (res.error) {
      toast.error(res.message);
      return false;
    }
    toast.success("Decision reopened — the document is pending review again.");
    onUpdated();
    return true;
  }

  return (
    <div className="dashboard-page ">
      <Link
        to="/requests"
        className="group mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-1" />
        Back to the queue
      </Link>

      <header className="dashboard-hero">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
              {stage
                ? `Stage ${stage} · ${STAGE_LABELS[stage]}`
                : "Unknown stage"}
            </p>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white">
              {request.trackingNumber}
            </h1>
            <p className="mt-2 text-sm text-white/75">
              {request.applicantName} · {request.serviceName}
              {request.isWalkIn ? " · Walk-in" : ""}
            </p>
          </div>
          <div className="civic-stagger flex flex-wrap gap-2">
            <span
              style={staggerStyle(0)}
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${status.styles}`}
            >
              {status.label}
            </span>
            <span
              style={staggerStyle(1)}
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${payment.styles}`}
            >
              {payment.label}
            </span>
          </div>
        </div>
      </header>

      <div className="civic-stagger mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div
          style={staggerStyle(0)}
          className="flex flex-col gap-6 lg:col-span-2"
        >
          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              Submitted details
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {Object.entries(request.formData).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {formDataLabel(key, request)}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {value == null || value === "" ? "—" : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              Uploaded requirements ({request.attachments.length})
            </h2>
            {request.attachments.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Nothing was pre-uploaded. Validate the physical documents at the
                counter.
              </p>
            ) : (
              <ItemGroup className="civic-stagger-auto gap-3">
                {request.attachments.map((doc) => (
                  <AttachmentRow
                    key={doc.id}
                    doc={doc}
                    canProcess={canProcess}
                    canReverse={canReverseVerification}
                    onDecide={handleAttachmentDecision}
                    onRevert={handleAttachmentRevert}
                  />
                ))}
              </ItemGroup>
            )}
          </section>

          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">History</h2>
            <Timeline className="civic-stagger-auto">
              {request.logs.map((log, index) => {
                const logStatus = getStatusDetails(log.actionStatus);
                // Logs come back oldest-first, so the last entry is the
                // request's current status — the one thing worth the eye
                // landing on first in an otherwise-quiet gray timeline.
                const isCurrent = index === request.logs.length - 1;
                return (
                  <TimelineItem key={log.id} step={index + 1}>
                    <TimelineHeader>
                      <TimelineSeparator />
                      <TimelineIndicator
                        className={`border-0 ${logStatus.dot} ${
                          isCurrent ? "size-4 ring-4 ring-primary/15" : "size-3"
                        }`}
                      />
                      <TimelineTitle>{logStatus.label}</TimelineTitle>
                      <TimelineDate dateTime={log.createdAt}>
                        {formatDateTime(log.createdAt)} · {log.actorName}
                      </TimelineDate>
                    </TimelineHeader>
                    {log.remarks && (
                      <TimelineContent>{log.remarks}</TimelineContent>
                    )}
                  </TimelineItem>
                );
              })}
            </Timeline>
          </section>
        </div>

        <div style={staggerStyle(1)} className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              Move this request
            </h2>

            {!canProcess ? (
              <p className="text-sm italic text-muted-foreground">
                Your role can view this request but not advance it.
              </p>
            ) : available.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                This request is {status.label.toLowerCase()} — nothing further
                to do.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {visibleTransitions.length > 0 && (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="remarks">
                        Remarks
                        {visibleTransitions.some((s) =>
                          REASON_REQUIRED.includes(s),
                        )
                          ? " (required to reject or mark incomplete)"
                          : " (optional)"}
                      </Label>
                      <Textarea
                        id="remarks"
                        rows={3}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="What should the applicant know?"
                      />
                    </div>

                    <div className="civic-stagger-auto flex flex-col gap-3">
                      {visibleTransitions.map((next) => (
                        <Button
                          key={next}
                          variant={next === "rejected" ? "outline" : "default"}
                          disabled={busy}
                          onClick={() => handleTransition(next)}
                        >
                          {TRANSITION_LABELS[next]}
                        </Button>
                      ))}
                    </div>
                  </>
                )}

                {needsAttachmentsResolved && (
                  <p className="civic-enter-sm rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-warning-strong">
                    Every uploaded requirement needs to be accepted first — some
                    are still pending or rejected.
                  </p>
                )}

                {request.status === "ready_for_release" &&
                  request.paymentStatus !== "verified" && (
                    <p className="civic-enter-sm rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-warning-strong">
                      Payment must be verified before this can be released.
                    </p>
                  )}
              </div>
            )}
          </section>

          <PaymentVerificationPanel
            requestId={request.id}
            status={request.status}
            feesDue={request.feesDue}
            paymentStatus={request.paymentStatus}
            orNumber={request.orNumber}
            onVerified={onUpdated}
          />
        </div>
      </div>
    </div>
  );
}

type AttachmentDoc = RequestDetail["attachments"][number];

function getFileKind(url: string): "image" | "pdf" | "other" {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(clean)) return "image";
  if (/\.pdf$/.test(clean)) return "pdf";
  return "other";
}

function AttachmentRow({
  doc,
  canProcess,
  canReverse,
  onDecide,
  onRevert,
}: {
  doc: AttachmentDoc;
  canProcess: boolean;
  canReverse: boolean;
  onDecide: (
    attachmentId: string,
    status: "approved" | "rejected",
    reason?: string,
  ) => Promise<boolean>;
  onRevert: (attachmentId: string, reason: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reverting, setReverting] = useState(false);
  const [revertReason, setRevertReason] = useState("");
  const [viewing, setViewing] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  async function handleViewFile() {
    setViewing(true);
    try {
      const res = await getAttachmentSignedUrlFn({
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

  async function handleAccept() {
    setBusy(true);
    try {
      await onDecide(doc.id, "approved");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmReject() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const ok = await onDecide(doc.id, "rejected", reason.trim());
      if (ok) {
        setRejecting(false);
        setReason("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmRevert() {
    if (!revertReason.trim()) return;
    setBusy(true);
    try {
      const ok = await onRevert(doc.id, revertReason.trim());
      if (ok) {
        setReverting(false);
        setRevertReason("");
      }
    } finally {
      setBusy(false);
    }
  }

  const fileKind = getFileKind(doc.fileUrl);

  return (
    <div className="flex flex-col gap-3">
      <Item variant="outline" className="rounded-lg border-border-light p-4">
        <ItemMedia variant="icon">
          {fileKind === "image" ? (
            <ImageIcon className="size-4" />
          ) : fileKind === "pdf" ? (
            <FileText className="size-4" />
          ) : (
            <File className="size-4" />
          )}
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="font-semibold text-foreground">
            {doc.subjectRole ? `${doc.subjectRole}: ` : ""}
            {doc.requirementName}
          </ItemTitle>
          <ItemDescription className="text-xs capitalize">
            {doc.verificationStatus}
            {doc.rejectionReason ? ` — ${doc.rejectionReason}` : ""}
          </ItemDescription>
        </ItemContent>
        <ItemActions className="flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            disabled={viewing}
            onClick={handleViewFile}
          >
            <ExternalLink className="size-4" />
            View file
          </Button>
          {canProcess && doc.verificationStatus === "pending" && !rejecting && (
            <>
              <Button
                size="sm"
                variant="success"
                disabled={busy}
                onClick={handleAccept}
              >
                <CheckCircle2 className="size-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => setRejecting(true)}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
            </>
          )}
          {canReverse && doc.verificationStatus !== "pending" && !reverting && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setReverting(true)}
            >
              Undo decision
            </Button>
          )}
        </ItemActions>
      </Item>

      {reverting && (
        <div className="civic-enter-sm flex flex-col gap-2 rounded-lg border border-border-light bg-muted/30 p-3">
          <Label htmlFor={`revert-reason-${doc.id}`}>
            Why is this decision being reopened?
          </Label>
          <Textarea
            id={`revert-reason-${doc.id}`}
            rows={2}
            value={revertReason}
            onChange={(e) => setRevertReason(e.target.value)}
            placeholder="What happened, so there's a record of why this was reopened?"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !revertReason.trim()}
              onClick={handleConfirmRevert}
            >
              Confirm undo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setReverting(false);
                setRevertReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="civic-enter-sm flex flex-col gap-2 rounded-lg border border-border-light bg-muted/30 p-3">
          <Label htmlFor={`reject-reason-${doc.id}`}>
            Reason for rejecting this document
          </Label>
          <Textarea
            id={`reject-reason-${doc.id}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What's wrong with this document, so the applicant can fix it?"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={handleConfirmReject}
            >
              Confirm reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={viewerUrl != null}
        onOpenChange={(open) => !open && setViewerUrl(null)}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {doc.subjectRole ? `${doc.subjectRole}: ` : ""}
              {doc.requirementName}
            </DialogTitle>
          </DialogHeader>
          {viewerUrl && (
            <div className="flex h-[75vh] items-center justify-center overflow-hidden">
              {fileKind === "image" ? (
                <img
                  src={viewerUrl}
                  alt={doc.requirementName}
                  className="h-full w-full rounded-md object-contain"
                />
              ) : fileKind === "pdf" ? (
                <iframe
                  src={viewerUrl}
                  title={doc.requirementName}
                  className="h-full w-full rounded-md border border-border-light"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
                  <p>This file type can't be previewed here.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    render={
                      <a
                        href={viewerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <ExternalLink className="size-4" />
                    Open in a new tab
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
