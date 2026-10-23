import { useRef, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Undo2,
  XCircle,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { AttachmentPreview } from "~/features/requests/components/AttachmentPreview";
import {
  RejectionReasonPicker,
  type RejectionReasonState,
} from "~/features/requests/components/RejectionReasonPicker";
import { DOCUMENT_REJECTION_REASONS } from "~/features/requests/rejection-reasons";
import { cn } from "~/lib/utils";

export const STATUS_LABEL: Record<string, string> = {
  approved: "Accepted",
  rejected: "Rejected",
  pending: "Pending",
};

function statusBadgeVariant(status: string) {
  if (status === "approved") return "success";
  if (status === "rejected") return "destructive";
  return "neutral";
}

/** The signed link for the open document: still loading, failed, or ready. */
export interface DocumentLink {
  url?: string;
  error?: string;
}

/**
 * The document's name and, on the same row, its status and the file's actions.
 * The name is never trimmed: a long one wraps within its own column, so the
 * actions stay where they are instead of dropping to a new line.
 */
export function DocumentViewerHeader({
  label,
  status,
  url,
  onExpand,
  expandLabel,
  asDialogTitle = false,
  className,
}: {
  label: string;
  status: string;
  url?: string;
  onExpand?: () => void;
  /** The expand button's shortcut, named in its label. */
  expandLabel?: string;
  asDialogTitle?: boolean;
  className?: string;
}) {
  const titleClass = "flex min-h-8 min-w-0 flex-1 items-center text-sm font-bold text-foreground";
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 py-3", className)}>
      {asDialogTitle ? (
        <DialogTitle className={titleClass}>{label}</DialogTitle>
      ) : (
        <h2 className={titleClass}>{label}</h2>
      )}
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant={statusBadgeVariant(status)}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
        {url && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open the file in a new tab"
            nativeButton={false}
            render={<a href={url} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink aria-hidden="true" />
          </Button>
        )}
        {onExpand && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Expand the file${expandLabel ? ` (${expandLabel})` : ""}`}
            title={`Expand${expandLabel ? ` (${expandLabel})` : ""}`}
            onClick={onExpand}
          >
            <Maximize2 aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** The file itself, or a placeholder of the same size while it loads. */
export function DocumentPreviewBox({
  link,
  name,
  className,
}: {
  link: DocumentLink | null;
  name: string;
  className: string;
}) {
  if (link?.url) {
    return <AttachmentPreview url={link.url} name={name} className={className} />;
  }
  if (link?.error) {
    return (
      <p
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        {link.error}
      </p>
    );
  }
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <Spinner className="size-4" aria-hidden="true" />
      Loading file…
    </div>
  );
}

export interface DecisionControls {
  docId: string;
  status: string;
  reason: string | null;
  /** The decision is waiting out its undo window. */
  held: boolean;
  canDecide: boolean;
  canReverse: boolean;
  confirmDecisions: boolean;
  busy: boolean;
  rejecting: boolean;
  rejection: RejectionReasonState;
  reopening: boolean;
  reopenReason: string;
  acceptKey: string;
  rejectKey: string;
  undoKey: string;
  /** Takes back a decision that is still waiting to be saved. */
  onCancelHeld: () => void;
  onAccept: () => void;
  onStartReject: () => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
  onStartReopen: () => void;
  onReopenReasonChange: (reason: string) => void;
  onConfirmReopen: () => void;
  onCancelReopen: () => void;
}

/** Accept and reject, the reason for a rejection, and taking a decision back. */
export function DocumentDecisionBar({
  controls: c,
  className,
}: {
  controls: DecisionControls;
  className?: string;
}) {
  const decided = c.status !== "pending";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border-light bg-card px-4 py-3",
        className,
      )}
    >
      {c.canDecide && c.rejecting && (
        <div
          data-captures-escape
          className="civic-enter-sm flex flex-col gap-3 rounded-lg border border-border-light bg-muted/30 p-3"
        >
          <RejectionReasonPicker
            idPrefix={`reject-${c.docId}`}
            legend="Why is this document rejected? The applicant sees it."
            reasons={DOCUMENT_REJECTION_REASONS}
            state={c.rejection}
            disabled={c.busy}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={c.busy || !c.rejection.reason}
              onClick={c.onConfirmReject}
            >
              Reject document
            </Button>
            <Button size="sm" variant="ghost" disabled={c.busy} onClick={c.onCancelReject}>
              Cancel <Kbd>Esc</Kbd>
            </Button>
          </div>
        </div>
      )}

      {c.canDecide && !c.rejecting && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="success" disabled={c.busy} onClick={c.onAccept}>
            <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
            Accept <Kbd>{c.acceptKey}</Kbd>
          </Button>
          <Button variant="outline" disabled={c.busy} onClick={c.onStartReject}>
            <XCircle data-icon="inline-start" aria-hidden="true" />
            Reject <Kbd>{c.rejectKey}</Kbd>
          </Button>
          {!c.confirmDecisions && (
            <span className="text-xs text-muted-foreground">
              Moves to the next document. You can undo for a few seconds.
            </span>
          )}
        </div>
      )}

      {!c.canDecide && !decided && (
        <p className="text-sm text-muted-foreground">
          Your role can view this document but not decide on it.
        </p>
      )}

      {decided && (
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5",
              c.status === "approved"
                ? "border-success/25 bg-success/5"
                : "border-destructive/25 bg-destructive/5",
            )}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              {c.status === "approved" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {STATUS_LABEL[c.status] ?? c.status}
                  {c.held && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · saving in a moment
                    </span>
                  )}
                </p>
                {c.reason && (
                  <p className="text-sm text-muted-foreground">{c.reason}</p>
                )}
              </div>
            </div>
            {c.held ? (
              <Button size="sm" variant="outline" onClick={c.onCancelHeld}>
                <Undo2 data-icon="inline-start" aria-hidden="true" />
                Undo <Kbd>{c.undoKey}</Kbd>
              </Button>
            ) : (
              c.canReverse &&
              !c.reopening && (
                <Button size="sm" variant="outline" disabled={c.busy} onClick={c.onStartReopen}>
                  <Undo2 data-icon="inline-start" aria-hidden="true" />
                  Undo decision
                </Button>
              )
            )}
          </div>
          {c.reopening && (
            <div
              data-captures-escape
              className="civic-enter-sm flex flex-col gap-2 rounded-lg border border-border-light bg-muted/30 p-3"
            >
              <Label htmlFor={`reopen-${c.docId}`}>
                Why is this decision being reopened?
              </Label>
              <Textarea
                id={`reopen-${c.docId}`}
                rows={2}
                value={c.reopenReason}
                onChange={(event) => c.onReopenReasonChange(event.target.value)}
                placeholder="What happened, so there's a record of why this was reopened?"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={c.busy || !c.reopenReason.trim()}
                  onClick={c.onConfirmReopen}
                >
                  Confirm undo
                </Button>
                <Button size="sm" variant="ghost" disabled={c.busy} onClick={c.onCancelReopen}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The document filling most of the screen, with the submitted details beside it
 * and the same accept and reject below. For reading small print on an ID or a
 * stamp without squinting.
 */
export function ExpandedDocumentView({
  open,
  onOpenChange,
  header,
  preview,
  decision,
  details,
  position,
  onStep,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header: ReactNode;
  preview: ReactNode;
  decision: ReactNode;
  details: ReactNode;
  /** "2 of 4", shown between the previous and next buttons. */
  position: string;
  onStep: (delta: number) => void;
}) {
  // Focus starts on the file, not on the first button, so no ring lands on an icon.
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        initialFocus={previewRef}
        showCloseButton={false}
        className="flex h-[94vh] w-[96vw] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <DialogDescription className="sr-only">
          Review the document, then accept or reject it.
        </DialogDescription>
        <div className="flex items-start gap-2 border-b border-border-light pr-4">
          <div className="min-w-0 flex-1">{header}</div>
          <div className="flex shrink-0 items-center gap-1 py-3">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous document"
              onClick={() => onStep(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">{position}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next document"
              onClick={() => onStep(1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => onOpenChange(false)}
            >
              Back to documents <Kbd>Esc</Kbd>
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              ref={previewRef}
              tabIndex={-1}
              className="relative min-h-0 flex-1 bg-muted/30 outline-none"
            >
              <div className="absolute inset-0 p-3">{preview}</div>
            </div>
            {decision}
          </div>
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border-light p-5 lg:block">
            <h2 className="mb-1 text-sm font-bold text-foreground">Submitted details</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Compare with the original in hand.
            </p>
            {details}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
