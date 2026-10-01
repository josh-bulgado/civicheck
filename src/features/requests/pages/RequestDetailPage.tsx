import { useRef, useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "~/components/ui/item";
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
  TRANSITION_LABELS,
  getStatusDetails,
  isPaymentSettled,
  nextStatuses,
  type RequestStatus,
} from "~/features/requests/request-workflow";
import { staggerStyle } from "~/components/motion/stagger";
import { AttachmentGroups } from "~/features/requests/components/AttachmentGroups";
import {
  AttachmentViewerDialog,
  getFileKind,
} from "~/features/requests/components/AttachmentViewerDialog";
import { RequestDetailHero } from "~/features/requests/components/RequestDetailHero";
import { RequestHistoryTimeline } from "~/features/requests/components/RequestHistoryTimeline";
import { SubmittedDetailsCard } from "~/features/requests/components/SubmittedDetailsCard";

// On-time birth registration is split by parents' marital status.
const CONFIRM_DECISION_SERVICE_CODES = ["OTCOLB-MARITAL", "OTCOLB-NONMARITAL"];

interface RequestDetailPageProps {
  request: RequestDetail;
  /** Called after a mutation succeeds, so the route can re-run its loader. */
  onUpdated: () => void;
}

export default function RequestDetailPage({
  request,
  onUpdated,
}: RequestDetailPageProps) {
  const { can, isAdmin } = usePermissions();

  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  const status = getStatusDetails(request.status);
  const available = nextStatuses(request.status);

  const canProcess = can("requests:process");
  const canReverseVerification = can("requests:reverse_verification");
  // Accept/reject confirmation is rolling out service by service — on-time
  // birth registration first.
  const confirmAttachmentDecisions =
    CONFIRM_DECISION_SERVICE_CODES.includes(request.serviceCode.toUpperCase());
  const hasUnresolvedAttachments = request.attachments.some(
    (doc) => doc.verificationStatus !== "approved",
  );
  const visibleTransitions = available.filter((s) => {
    if (s === "processing" && hasUnresolvedAttachments) return false;
    // Releasing the document is the final step — CCRO admin only.
    if (s === "released" && !isAdmin) return false;
    return true;
  });
  // Release waits on the cashier's payment check, unless no fee is due.
  const paymentSettled = isPaymentSettled(request.feesDue, request.paymentStatus);
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

      <RequestDetailHero
        trackingNumber={request.trackingNumber}
        status={request.status}
        paymentStatus={request.paymentStatus}
        feesDue={request.feesDue}
        subtitle={
          <>
            {request.applicantName} · {request.serviceName}
            {request.isWalkIn ? " · Walk-in" : ""}
          </>
        }
      />

      <div className="civic-stagger mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div
          style={staggerStyle(0)}
          className="flex flex-col gap-6 lg:col-span-2"
        >
          <SubmittedDetailsCard request={request} showEmpty />

          <section className="dashboard-panel p-6">
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
                <AttachmentGroups
                  docs={request.attachments}
                  renderRow={(doc, title) => (
                    <AttachmentRow
                      key={doc.id}
                      doc={doc}
                      title={title}
                      canProcess={canProcess}
                      canReverse={canReverseVerification}
                      confirmDecision={confirmAttachmentDecisions}
                      onDecide={handleAttachmentDecision}
                      onRevert={handleAttachmentRevert}
                    />
                  )}
                />
              </ItemGroup>
            )}
          </section>

          <RequestHistoryTimeline
            logs={request.logs}
            audience="staff"
            feesDue={request.feesDue}
          />
        </div>

        <div style={staggerStyle(1)} className="flex flex-col gap-6">
          <section className="dashboard-panel p-6">
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
                      {visibleTransitions.map((next) => {
                        const awaitingPayment = next === "released" && !paymentSettled;
                        return (
                        <Button
                          key={next}
                          variant={next === "rejected" ? "outline" : "default"}
                          disabled={busy || awaitingPayment}
                          // Gray, not just faded blue, so a payment-locked
                          // release reads as unavailable at a glance.
                          className={
                            awaitingPayment
                              ? "disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                              : undefined
                          }
                          onClick={() => handleTransition(next)}
                        >
                          {TRANSITION_LABELS[next]}
                        </Button>
                        );
                      })}
                    </div>
                  </>
                )}

                {needsAttachmentsResolved && (
                  <p className="civic-enter-sm rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-warning-strong">
                    Every uploaded requirement needs to be accepted first — some
                    are still pending or rejected.
                  </p>
                )}

                {request.status === "ready_for_release" && !isAdmin && (
                  <p className="civic-enter-sm rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Only the CCRO admin can release the document once payment
                    is verified.
                  </p>
                )}

                {request.status === "ready_for_release" && !paymentSettled && (
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

function AttachmentRow({
  doc,
  title,
  canProcess,
  canReverse,
  confirmDecision,
  onDecide,
  onRevert,
}: {
  doc: AttachmentDoc;
  /** Overrides the requirement name, e.g. "File 2 of 3" inside a group. */
  title?: string;
  canProcess: boolean;
  canReverse: boolean;
  /** Ask "are you sure?" before an accept/reject is actually saved. */
  confirmDecision: boolean;
  onDecide: (
    attachmentId: string,
    status: "approved" | "rejected",
    reason?: string,
  ) => Promise<boolean>;
  onRevert: (attachmentId: string, reason: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<
    "approved" | "rejected" | null
  >(null);
  const [reason, setReason] = useState("");
  const [reverting, setReverting] = useState(false);
  const [revertReason, setRevertReason] = useState("");
  const [viewing, setViewing] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const confirmButton = useRef<HTMLButtonElement | null>(null);

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
      setPendingDecision(null);
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
      setPendingDecision(null);
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
            {title ?? `${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${doc.requirementName}`}
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
                onClick={
                  confirmDecision
                    ? () => setPendingDecision("approved")
                    : handleAccept
                }
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
              onClick={
                confirmDecision
                  ? () => setPendingDecision("rejected")
                  : handleConfirmReject
              }
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

      <AlertDialog
        open={pendingDecision != null}
        onOpenChange={(open) => !open && !busy && setPendingDecision(null)}
      >
        {/* Accepting is routine and reversible ("Undo decision"), so "Yes"
            takes focus and Enter confirms. Rejecting keeps the default
            (first focusable = Cancel) so it can't be fired by a stray Enter. */}
        <AlertDialogContent
          initialFocus={pendingDecision === "approved" ? confirmButton : true}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDecision === "approved"
                ? "Accept this document?"
                : "Reject this document?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDecision === "approved"
                ? `"${doc.requirementName}" will be marked as accepted.`
                : `"${doc.requirementName}" will be marked as rejected and the applicant will see your reason.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              ref={confirmButton}
              variant={pendingDecision === "approved" ? "success" : "destructive"}
              disabled={busy}
              onClick={
                pendingDecision === "approved"
                  ? handleAccept
                  : handleConfirmReject
              }
            >
              {pendingDecision === "approved" ? "Yes, accept" : "Yes, reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AttachmentViewerDialog
        url={viewerUrl}
        subjectRole={doc.subjectRole}
        requirementName={doc.requirementName}
        onClose={() => setViewerUrl(null)}
      />
    </div>
  );
}
