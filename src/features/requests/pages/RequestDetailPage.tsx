import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
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
import type { RequestDetail } from "~/features/requests/requests.queries";
import {
  advanceRequestStatusFn,
  getAttachmentSignedUrlFn,
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

export default function RequestDetailPage({ request, onUpdated }: RequestDetailPageProps) {
  const { can } = usePermissions();

  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  const status = getStatusDetails(request.status);
  const payment = getPaymentDetails(request.paymentStatus);
  const stage = stageOf(request.status);
  const available = nextStatuses(request.status);

  const canProcess = can("requests:process");

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
        <div style={staggerStyle(0)} className="flex flex-col gap-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              Submitted details
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {Object.entries(request.formData).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {formatKey(key)}
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
              <div className="civic-stagger-auto flex flex-col gap-3">
                {request.attachments.map((doc) => (
                  <AttachmentRow
                    key={doc.id}
                    doc={doc}
                    canProcess={canProcess}
                    onDecide={handleAttachmentDecision}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">History</h2>
            <ol className="civic-stagger-auto flex flex-col gap-4">
              {request.logs.map((log) => (
                <li key={log.id} className="flex gap-4">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {getStatusDetails(log.actionStatus).label}
                    </p>
                    {log.remarks && (
                      <p className="text-sm text-muted-foreground">
                        {log.remarks}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)} · {log.actorName}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="remarks">
                    Remarks
                    {available.some((s) => REASON_REQUIRED.includes(s))
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
                  {available.map((next) => (
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
  onDecide,
}: {
  doc: AttachmentDoc;
  canProcess: boolean;
  onDecide: (
    attachmentId: string,
    status: "approved" | "rejected",
    reason?: string,
  ) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
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

  const fileKind = getFileKind(doc.fileUrl);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-light p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {doc.requirementName}
          </p>
          <p className="text-xs capitalize text-muted-foreground">
            {doc.verificationStatus}
            {doc.rejectionReason ? ` — ${doc.rejectionReason}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
                variant="outline"
                disabled={busy}
                onClick={handleAccept}
              >
                <CheckCircle2 className="size-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setRejecting(true)}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{doc.requirementName}</DialogTitle>
          </DialogHeader>
          {viewerUrl && (
            <div className="flex max-h-[75vh] flex-col items-center overflow-auto">
              {fileKind === "image" ? (
                <img
                  src={viewerUrl}
                  alt={doc.requirementName}
                  className="max-h-[70vh] w-full rounded-md object-contain"
                />
              ) : fileKind === "pdf" ? (
                <iframe
                  src={viewerUrl}
                  title={doc.requirementName}
                  className="h-[70vh] w-full rounded-md border border-border-light"
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
