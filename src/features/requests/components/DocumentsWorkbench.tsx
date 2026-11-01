import { documentReviewBlockedReason } from "../document-review";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys, type HotkeyChord } from "@tanstack/react-hotkeys";
import { CheckCircle2, Circle, FileText, XCircle } from "lucide-react";
import { Kbd } from "~/components/ui/kbd";
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
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import {
  DocumentDecisionBar,
  DocumentPreviewBox,
  DocumentViewerHeader,
  ExpandedDocumentView,
  STATUS_LABEL,
  type DecisionControls,
} from "~/features/requests/components/DocumentViewer";
import { groupByRequirement } from "~/features/requests/components/AttachmentGroups";
import { useRejectionReason } from "~/features/requests/components/RejectionReasonPicker";
import { SubmittedDetailsCard } from "~/features/requests/components/SubmittedDetailsCard";
import { DOCUMENT_REJECTION_REASONS } from "~/features/requests/rejection-reasons";
import { getAttachmentSignedUrlFn } from "~/features/requests/requests.mutations";
import type { RequestDetail } from "~/features/requests/requests.queries";
import type {
  Decision,
  QueuedDecisions,
} from "~/features/requests/hooks/useQueuedDecisions";

import { buildVerificationFormPdf } from "~/features/requests/pdf/useVerificationFormPdfDownload";

const GENERATED_FORM_ID = "generated-verification-form";

type Attachment = RequestDetail["attachments"][number];

interface Verdict {
  status: string;
  reason: string | null;
}

/** Signed links last five minutes; reuse one for four. */
const LINK_REUSE_MS = 240_000;

const NEXT_HOTKEY: HotkeyChord = "J";
const PREVIOUS_HOTKEY: HotkeyChord = "K";
const ACCEPT_HOTKEY: HotkeyChord = "A";
const REJECT_HOTKEY: HotkeyChord = "R";
const UNDO_HOTKEY: HotkeyChord = "Z";
const EXPAND_HOTKEY: HotkeyChord = "F";
const REASON_HOTKEYS: HotkeyChord[] = ["1", "2", "3", "4", "5"];

function entryLabel(doc: Attachment) {
  return `${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${doc.requirementName}`;
}

export function StatusIcon({ status }: { status: string }) {
  if (status === "approved") {
    return <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />;
  }
  if (status === "rejected") {
    return <XCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />;
  }
  return <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}


interface DocumentsWorkbenchProps {
  request: RequestDetail;
  /** Shortcuts only listen while this tab is the one showing. */
  active: boolean;
  /** A dialog or drawer is open on top, so a stray key must not decide a document. */
  paused: boolean;
  canProcess: boolean;
  canReverse: boolean;
  /** Ask "are you sure?" before a decision is saved, instead of offering undo. */
  confirmDecisions: boolean;
  /** Decisions held for a few seconds so they can be undone, then saved. */
  decisions: QueuedDecisions;
  /** The open document, kept by the page so the overview can open one here. */
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  /** Saves a decision at once, for services that ask for a confirm instead. */
  onDecide: (
    attachmentId: string,
    status: Decision,
    reason?: string,
  ) => Promise<boolean>;
  onRevert: (attachmentId: string, reason: string) => Promise<boolean>;
}

/**
 * Review the uploaded documents: the list, a large preview, and the submitted
 * details side by side. Accept and reject are one key press. Unless the service
 * asks for a confirm, a decision is held for a few seconds so it can be undone.
 */
export function DocumentsWorkbench({
  request,
  active,
  paused,
  canProcess,
  canReverse,
  confirmDecisions,
  decisions,
  selectedId,
  onSelectedIdChange: setSelectedId,
  onDecide,
  onRevert,
}: DocumentsWorkbenchProps) {
  const hotkeyLabel = useHotkeyLabel();
  const { attachments } = request;
  const blockedReason = documentReviewBlockedReason(request.status);

  const hasVerificationForm = typeof request.formData.requester_first_name === "string";
  const generatedEntry = useMemo(() => hasVerificationForm ? [{
    doc: {
      id: GENERATED_FORM_ID,
      requirementName: "Verification Form",
      subjectRole: null,
      fileUrl: "",
      verificationStatus: "generated",
      rejectionReason: null,
    } satisfies Attachment,
    label: "Verification Form",
  }] : [], [hasVerificationForm]);

  const entries = useMemo(
    () =>
      [...groupByRequirement(attachments).flatMap((group) =>
        group.docs.map((doc, index) => ({
          doc,
          label:
            group.docs.length > 1
              ? `${group.title} · file ${index + 1} of ${group.docs.length}`
              : group.title,
        })),
      ), ...generatedEntry],
    [attachments, generatedEntry],
  );

  const verdictOf = (doc: Attachment): Verdict =>
    decisions.waiting[doc.id] ?? {
      status: doc.verificationStatus,
      reason: doc.rejectionReason,
    };

  const firstPending = entries.find((entry) => verdictOf(entry.doc).status === "pending");
  const selected =
    entries.find((entry) => entry.doc.id === selectedId) ??
    firstPending ??
    entries[0] ??
    null;

  const [expanded, setExpanded] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const rejection = useRejectionReason();
  const [reopening, setReopening] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<{
    doc: Attachment;
    status: Decision;
    reason?: string;
  } | null>(null);
  const confirmButton = useRef<HTMLButtonElement | null>(null);

  function select(id: string) {
    setSelectedId(id);
    setRejectingId(null);
    rejection.reset();
    setReopening(false);
    setReopenReason("");
  }

  function step(delta: number) {
    if (!selected || entries.length === 0) return;
    const index = entries.findIndex((entry) => entry.doc.id === selected.doc.id);
    const next = entries[(index + delta + entries.length) % entries.length];
    select(next.doc.id);
  }

  function nextPendingAfter(id: string) {
    const index = entries.findIndex((entry) => entry.doc.id === id);
    for (let offset = 1; offset < entries.length; offset += 1) {
      const entry = entries[(index + offset) % entries.length];
      if (verdictOf(entry.doc).status === "pending") return entry.doc.id;
    }
    return id;
  }

  // The link for the selected file, signed on demand and reused while it lasts.
  const links = useRef(new Map<string, { url: string; at: number }>());
  const [link, setLink] = useState<{ id: string; url?: string; error?: string } | null>(
    null,
  );
  const selectedDocId = selected?.doc.id;
  useEffect(() => {
    if (!active || !selectedDocId) return;
    if (selectedDocId === GENERATED_FORM_ID) {
      let cancelled = false;
      let objectUrl: string | undefined;
      setLink({ id: selectedDocId });
      void buildVerificationFormPdf({
        trackingNumber: request.trackingNumber,
        copies: request.copies,
        formData: request.formData,
      }).then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setLink({ id: selectedDocId, url: `${objectUrl}#verification.pdf` });
      }).catch(() => {
        if (!cancelled) setLink({ id: selectedDocId, error: "Could not prepare the verification form. Select it again to retry." });
      });
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
    const cached = links.current.get(selectedDocId);
    if (cached && Date.now() - cached.at < LINK_REUSE_MS) {
      setLink({ id: selectedDocId, url: cached.url });
      return;
    }
    let cancelled = false;
    setLink({ id: selectedDocId });
    getAttachmentSignedUrlFn({ data: { attachmentId: selectedDocId } })
      .then((res) => {
        if (cancelled) return;
        if (res.error) {
          setLink({ id: selectedDocId, error: res.message });
          return;
        }
        links.current.set(selectedDocId, { url: res.url, at: Date.now() });
        setLink({ id: selectedDocId, url: res.url });
      })
      .catch(() => {
        if (!cancelled) {
          setLink({ id: selectedDocId, error: "Could not load this file." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active, selectedDocId, request.trackingNumber, request.copies, request.formData]);

  function decide(doc: Attachment, status: Decision, reason?: string) {
    if (!canProcess || blockedReason || verdictOf(doc).status !== "pending") return;
    if (confirmDecisions) {
      setConfirming({ doc, status, reason });
      return;
    }
    decisions.queue(doc.id, status, reason, {
      label: entryLabel(doc),
      onUndo: () => select(doc.id),
    });
    select(nextPendingAfter(doc.id));
  }

  async function confirmDecision() {
    if (!confirming || blockedReason) return;
    setBusy(true);
    try {
      const ok = await onDecide(
        confirming.doc.id,
        confirming.status,
        confirming.reason,
      );
      if (ok) {
        setRejectingId(null);
        rejection.reset();
        select(nextPendingAfter(confirming.doc.id));
      }
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  async function reopen(doc: Attachment) {
    if (!reopenReason.trim()) return;
    setBusy(true);
    try {
      const ok = await onRevert(doc.id, reopenReason.trim());
      if (ok) {
        setReopening(false);
        setReopenReason("");
      }
    } finally {
      setBusy(false);
    }
  }

  const selectedVerdict = selected ? verdictOf(selected.doc) : null;
  // The link counts only for the document it was signed for.
  const shownLink = link && selected && link.id === selected.doc.id ? link : null;
  const selectedIndex = selected
    ? entries.findIndex((entry) => entry.doc.id === selected.doc.id)
    : -1;

  const canDecide =
    canProcess && !blockedReason && selected != null && selectedVerdict?.status === "pending";
  const rejectingSelected = selected != null && rejectingId === selected.doc.id;

  const controls: DecisionControls | null =
    selected && selectedVerdict && selected.doc.id !== GENERATED_FORM_ID
      ? {
          docId: selected.doc.id,
          status: selectedVerdict.status,
          reason: selectedVerdict.reason,
          held: selected.doc.id in decisions.waiting,
          canDecide,
          blockedReason: canProcess ? blockedReason : null,
          canReverse,
          confirmDecisions,
          busy,
          rejecting: rejectingSelected,
          rejection,
          reopening,
          reopenReason,
          acceptKey: hotkeyLabel(ACCEPT_HOTKEY),
          rejectKey: hotkeyLabel(REJECT_HOTKEY),
          undoKey: hotkeyLabel(UNDO_HOTKEY),
          onCancelHeld: () => decisions.cancel(selected.doc.id),
          onAccept: () => decide(selected.doc, "approved"),
          onStartReject: () => setRejectingId(selected.doc.id),
          onConfirmReject: () => {
            decide(selected.doc, "rejected", rejection.reason);
            setRejectingId(null);
            rejection.reset();
          },
          onCancelReject: () => {
            setRejectingId(null);
            rejection.reset();
          },
          onStartReopen: () => setReopening(true),
          onReopenReasonChange: setReopenReason,
          onConfirmReopen: () => reopen(selected.doc),
          onCancelReopen: () => {
            setReopening(false);
            setReopenReason("");
          },
        }
      : null;

  const shortcuts = active && !paused && !confirming;

  useHotkeys([
    { hotkey: NEXT_HOTKEY, callback: () => step(1), options: { enabled: shortcuts } },
    { hotkey: PREVIOUS_HOTKEY, callback: () => step(-1), options: { enabled: shortcuts } },
    {
      hotkey: ACCEPT_HOTKEY,
      callback: () => selected && decide(selected.doc, "approved"),
      options: { enabled: shortcuts && canDecide },
    },
    {
      hotkey: REJECT_HOTKEY,
      callback: () => selected && setRejectingId(selected.doc.id),
      options: { enabled: shortcuts && canDecide },
    },
    {
      hotkey: EXPAND_HOTKEY,
      callback: () => setExpanded((open) => !open),
      options: { enabled: shortcuts && selected != null },
    },
    {
      hotkey: UNDO_HOTKEY,
      callback: () => decisions.cancelLast(),
      options: { enabled: shortcuts && selected?.doc.id !== GENERATED_FORM_ID },
    },
    {
      hotkey: "Escape",
      callback: () => {
        setRejectingId(null);
        rejection.reset();
        setReopening(false);
        setReopenReason("");
      },
      options: { enabled: shortcuts && (rejectingSelected || reopening) },
    },
    ...REASON_HOTKEYS.map((hotkey, index) => ({
      hotkey,
      callback: () => rejection.setChoice(DOCUMENT_REJECTION_REASONS[index]),
      options: { enabled: shortcuts && rejectingSelected },
    })),
  ]);

  const accepted = entries.filter((entry) => verdictOf(entry.doc).status === "approved").length;
  const details = (
    <aside className="dashboard-panel min-w-0 p-5 lg:col-span-2 xl:col-span-1">
      <h2 className="mb-1 text-sm font-bold text-foreground">Submitted details</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Check these against the uploaded document.
      </p>
      <SubmittedDetailsCard request={request} showEmpty bare compact />
    </aside>
  );

  if (entries.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="dashboard-panel p-6">
          <h2 className="text-sm font-bold text-foreground">Documents</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {request.isWalkIn
              ? "Walk-in. Validate the physical documents at the counter."
              : "Nothing was uploaded. The originals are checked at release."}
          </p>
        </section>
        {details}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_18rem]">
      <section className="dashboard-panel min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border-light px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Documents</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {accepted} of {attachments.length} accepted
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Documents accepted"
          aria-valuemin={0}
          aria-valuemax={attachments.length}
          aria-valuenow={accepted}
          className="h-1 bg-muted"
        >
          <div
            className="h-full origin-left bg-success transition-transform duration-200 motion-reduce:transition-none"
            style={{ transform: `scaleX(${attachments.length ? accepted / attachments.length : 0})` }}
          />
        </div>
        <ul className="divide-y divide-border-light">
          {entries.map(({ doc, label }) => {
            const verdict = verdictOf(doc);
            const current = selected?.doc.id === doc.id;
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => select(doc.id)}
                  className="flex w-full items-start gap-2.5 border-l-[3px] border-transparent px-4 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=true]:border-primary-fill aria-[current=true]:bg-primary-tint"
                >
                  <span className="mt-0.5">
                    {doc.id === GENERATED_FORM_ID
                      ? <FileText className="size-4 text-primary" aria-hidden="true" />
                      : <StatusIcon status={verdict.status} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {STATUS_LABEL[verdict.status] ?? verdict.status}
                      {verdict.status === "rejected" && verdict.reason
                        ? `: ${verdict.reason}`
                        : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-light px-4 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>{hotkeyLabel(NEXT_HOTKEY)}</Kbd>
            <Kbd>{hotkeyLabel(PREVIOUS_HOTKEY)}</Kbd> move
          </span>
          <span className="flex items-center gap-1">
            <Kbd>{hotkeyLabel(EXPAND_HOTKEY)}</Kbd> expand
          </span>
          {canProcess && selected?.doc.id !== GENERATED_FORM_ID && (
            <>
              <span className="flex items-center gap-1">
                <Kbd>{hotkeyLabel(ACCEPT_HOTKEY)}</Kbd> accept
              </span>
              <span className="flex items-center gap-1">
                <Kbd>{hotkeyLabel(REJECT_HOTKEY)}</Kbd> reject
              </span>
              {!confirmDecisions && (
                <span className="flex items-center gap-1">
                  <Kbd>{hotkeyLabel(UNDO_HOTKEY)}</Kbd> undo
                </span>
              )}
            </>
          )}
        </p>
      </section>

      {selected && selectedVerdict && (
        // On a wide screen the viewer stays put while the list and details
        // scroll, and fills the height of the screen, so the file is as large
        // as it can be with accept and reject always in reach.
        <section className="dashboard-panel flex min-w-0 flex-col lg:sticky lg:top-4 lg:h-[calc(100vh-3rem)] lg:self-start">
          <DocumentViewerHeader
            label={selected.label}
            status={selectedVerdict.status}
            url={shownLink?.url}
            onExpand={() => setExpanded(true)}
            expandLabel={hotkeyLabel(EXPAND_HOTKEY)}
            className="rounded-t-xl border-b border-border-light"
          />
          <div className="relative h-[60vh] bg-muted/30 lg:h-auto lg:min-h-0 lg:flex-1">
            <div className="absolute inset-0 p-3">
              {/* The expanded view shows the file, so it is not loaded twice. */}
              {!expanded && (
                <DocumentPreviewBox
                  link={shownLink}
                  name={entryLabel(selected.doc)}
                  className="h-full"
                />
              )}
            </div>
          </div>
          {!expanded && controls && (
            <DocumentDecisionBar
              controls={controls}
              className="max-h-[60%] shrink-0 overflow-y-auto rounded-b-xl max-lg:sticky max-lg:bottom-0 max-lg:z-10"
            />
          )}
        </section>
      )}

      {selected && selectedVerdict && (
        <ExpandedDocumentView
          open={expanded}
          onOpenChange={setExpanded}
          header={
            <DocumentViewerHeader
              asDialogTitle
              label={selected.label}
              status={selectedVerdict.status}
              url={shownLink?.url}
            />
          }
          preview={
            <DocumentPreviewBox
              link={shownLink}
              name={entryLabel(selected.doc)}
              className="h-full"
            />
          }
          decision={controls ? <DocumentDecisionBar controls={controls} /> : null}
          details={<SubmittedDetailsCard request={request} showEmpty bare />}
          position={`${selectedIndex + 1} of ${entries.length}`}
          onStep={step}
          navigationEnabled={shortcuts && entries.length > 1}
        />
      )}

      {details}

      <AlertDialog
        open={confirming != null}
        onOpenChange={(open) => !open && !busy && setConfirming(null)}
      >
        {/* Accepting is routine and reversible, so "Yes" takes focus and Enter
            confirms. Rejecting keeps the default (Cancel) so a stray Enter
            cannot fire it. */}
        <AlertDialogContent
          initialFocus={confirming?.status === "approved" ? confirmButton : true}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming?.status === "approved"
                ? "Accept this document?"
                : "Reject this document?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming?.status === "approved"
                ? `"${confirming.doc.requirementName}" will be marked as accepted.`
                : `"${confirming?.doc.requirementName}" will be marked as rejected and the applicant will see your reason.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              ref={confirmButton}
              variant={confirming?.status === "approved" ? "success" : "destructive"}
              disabled={busy}
              onClick={confirmDecision}
            >
              {confirming?.status === "approved" ? "Yes, accept" : "Yes, reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
