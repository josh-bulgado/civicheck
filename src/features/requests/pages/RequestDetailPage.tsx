import { useState } from "react";
import { ElectronicEndorsementPanel } from "../components/ElectronicEndorsementPanel";
import { MarriagePostingPanel } from "../components/MarriagePostingPanel";
import { usePostingToday } from "../hooks/usePostingToday";
import { needsMarriagePosting } from "../marriage-posting";
import { useHotkeys, type HotkeyChord } from "@tanstack/react-hotkeys";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { usePermissions } from "~/hooks/usePermissions";
import { useEscapeToLeave } from "~/features/requests/hooks/useEscapeToLeave";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import {
  Tabs,
  TabsContent,
  TabsCount,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import type { RequestDetail } from "~/features/requests/requests.queries";
import {
  advanceRequestStatusFn,
  revertAttachmentVerificationFn,
  setAttachmentVerificationFn,
} from "~/features/requests/requests.mutations";
import { PaymentVerificationPanel } from "~/features/requests/components/PaymentVerificationPanel";
import {
  describeRequestProgress,
  planRequestActions,
  type PlannedAction,
  type TransitionDialog,
  type TransitionConfirmations,
} from "~/features/requests/request-actions";
import {
  getStatusDetails,
  hasCurrentOriginalDocumentCheck,
  type RequestStatus,
} from "~/features/requests/request-workflow";
import { quickReplies } from "~/features/requests/request-messages";
import {
  useQueuedDecisions,
  type DecisionSaveOptions,
} from "~/features/requests/hooks/useQueuedDecisions";
import { DocumentsWorkbench } from "~/features/requests/components/DocumentsWorkbench";
import { RequestActionBar } from "~/features/requests/components/RequestActionBar";
import { RequestClaimControl } from "~/features/requests/components/RequestClaimControl";
import { RequestChatDrawer } from "~/features/requests/components/RequestChatDrawer";
import { RequestDetailHeader } from "~/features/requests/components/RequestDetailHeader";
import { RequestHandoffConcerns } from "~/features/requests/components/RequestHandoffConcerns";
import { RequestHistoryLog } from "~/features/requests/components/RequestHistoryLog";
import { RequestMessagesCard } from "~/features/requests/components/RequestMessagesCard";
import { RequestNextBar } from "~/features/requests/components/RequestNextBar";
import { RequestOverview } from "~/features/requests/components/RequestOverview";
import { RequestTransitionDialog } from "~/features/requests/components/RequestTransitionDialog";
import { VerificationFormCard } from "~/features/requests/components/VerificationFormCard";
import { requestClaimBlockedReason } from "~/features/requests/request-claims";

// On-time birth registration is split by parents' marital status. Rejections
// still ask for confirmation; accepting always uses the reversible undo flow.
const CONFIRM_REJECTION_SERVICE_CODES = ["OTCOLB-MARITAL", "OTCOLB-NONMARITAL"];
const CHAT_HOTKEY: HotkeyChord = "C";

const DIALOG_TARGET: Record<TransitionDialog, RequestStatus> = {
  endorsement: "ready_for_release",
  return: "under_validation",
  court: "processing",
  originals: "ready_for_release",
  incomplete: "incomplete",
  reject: "rejected",
  release: "released",
};

export const REQUEST_DETAIL_TABS = ["overview", "documents", "chat", "history"] as const;
export type RequestDetailTab = (typeof REQUEST_DETAIL_TABS)[number];

interface RequestDetailPageProps {
  request: RequestDetail;
  /** The tab named in the URL, if any. */
  tab?: RequestDetailTab;
  onTabChange: (tab: RequestDetailTab) => void;
  /** Back to the queue the staff member came from. */
  onBack: () => void;
  /** Called after a mutation succeeds, so the route can re-run its loader. */
  onUpdated: () => void | Promise<unknown>;
}

export default function RequestDetailPage({
  request,
  tab: requestedTab,
  onTabChange,
  onBack,
  onUpdated,
}: RequestDetailPageProps) {
  const { can } = usePermissions();
  const hotkeyLabel = useHotkeyLabel();

  const canProcess = can("requests:process");
  const today = usePostingToday(needsMarriagePosting(request.serviceCode) && request.status === "processing");
  const canReverse = can("requests:reverse_verification");
  const hasChat = request.allowsMessages && !request.isWalkIn;
  const confirmRejections = CONFIRM_REJECTION_SERVICE_CODES.includes(
    request.serviceCode.toUpperCase(),
  );

  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<TransitionDialog | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  async function handleAttachmentDecision(
    attachmentId: string,
    status: "approved" | "rejected",
    reason?: string,
    options?: DecisionSaveOptions,
  ) {
    const res = await setAttachmentVerificationFn({
      data: { attachmentId, status, reason },
    });
    if (res.error) {
      toast.error(res.message);
      if (options?.refresh !== false) await onUpdated();
      return false;
    }
    if (options?.refresh !== false) await onUpdated();
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
    toast.success(
      res.returnedToValidation
        ? "Decision reopened — the request is back under validation."
        : "Decision reopened — the document is pending review again.",
    );
    await onUpdated();
    return true;
  }

  const decisions = useQueuedDecisions(handleAttachmentDecision);

  const handlingBlockedReason = canProcess
    ? requestClaimBlockedReason(request.claim, request.status)
    : null;
  const ownsStageClaim = canProcess && handlingBlockedReason == null;

  // What the page shows right away: a decision still in its undo window counts.
  const attachments = request.attachments.map((doc) => {
    const held = decisions.waiting[doc.id];
    return held
      ? { ...doc, verificationStatus: held.status, rejectionReason: held.reason }
      : doc;
  });
  const planInput = {
    endorsement: request.endorsement,
    postingStartDate: request.postingStartDate,
    today,
    serviceCode: request.serviceCode,
    status: request.status,
    paymentStatus: request.paymentStatus,
    feesDue: request.feesDue,
    canProcess,
    attachments,
    isWalkIn: request.isWalkIn,
    actionBlockedReason: handlingBlockedReason,
  };
  const plan = planRequestActions(planInput);
  const summary = describeRequestProgress(planInput);

  const accepted = attachments.filter((doc) => doc.verificationStatus === "approved").length;
  const pending = attachments.filter((doc) => doc.verificationStatus === "pending").length;
  const lastMessage = request.messages.at(-1);
  const suggestions = quickReplies(request.status, request.feesDue, request.serviceCode);
  const waitingForReply = hasChat && lastMessage?.senderRole === "applicant";
  // The URL names the tab, so a link or a reload lands where staff were. With
  // none named, open on the documents when there are any to review.
  const tab: RequestDetailTab =
    requestedTab && (requestedTab !== "chat" || hasChat)
      ? requestedTab
      : request.attachments.length > 0
        ? "documents"
        : "overview";

  function openDocument(id: string) {
    setSelectedDocId(id);
    onTabChange("documents");
  }

  async function runTransition(to: RequestStatus, remarks: string, confirmations: TransitionConfirmations = {}) {
    setBusy(true);
    try {
      // Decisions still in their undo window are saved first, so the server
      // checks the same documents the staff member is looking at.
      const decisionsSaved = await decisions.flush();
      if (!decisionsSaved) {
        await onUpdated();
        return false;
      }
      const res = await advanceRequestStatusFn({
        data: { requestId: request.id, toStatus: to, remarks, ...confirmations,
          ...(request.serviceCode === "ELEC_ENDORSEMENT" && to === "ready_for_release" ? { expectedUpdatedAt: request.updatedAt } : {}),
        },
      });
      if (res.error) {
        toast.error("Could not update this request", { description: res.message });
        await onUpdated();
        return false;
      }
      toast.success(`Moved to ${getStatusDetails(to).label}`);
      setNote("");
      await onUpdated();
      return true;
    } finally {
      setBusy(false);
    }
  }

  function handleAction(action: PlannedAction) {
    if (action.to === "processing" &&
      ["COURT-ANNULMENT", "COURT-FOREIGN-ADOPTION"].includes(request.serviceCode) &&
      !["yes", "no"].includes(String(request.formData.issued_by_rtc_legazpi ?? ""))) {
      setDialog("court");
      return;
    }
    if (action.dialog) {
      setDialog(action.dialog);
      return;
    }
    // The note box shows only beside a plain main action, so a note typed
    // earlier is not sent along with something else.
    const noteShown = plan.primary != null && plan.primary.dialog == null;
    void runTransition(action.to, noteShown ? note.trim() : "");
  }

  async function handleDialogConfirm(type: TransitionDialog, text: string, confirmations: TransitionConfirmations = {}) {
    if (await runTransition(DIALOG_TARGET[type], text, confirmations)) setDialog(null);
  }

  // Escape goes back to the queue once nothing else is open. A note being
  // written is kept, so Escape leaves it alone until it is sent or cleared.
  useEscapeToLeave({ enabled: !dialog && !chatOpen && !note.trim(), onLeave: onBack });

  useHotkeys([
    {
      hotkey: CHAT_HOTKEY,
      callback: () => setChatOpen(true),
      options: { enabled: hasChat && tab === "documents" && !chatOpen && !dialog },
    },
  ]);

  return (
    <div className="dashboard-page">
      <RequestDetailHeader
        onBack={onBack}
        trackingNumber={request.trackingNumber}
        status={request.status}
        paymentStatus={request.paymentStatus}
        feesDue={request.feesDue}
        subtitle={
          <>
            {request.applicantName} · {request.serviceName}
            {request.isWalkIn ? " · Walk-in" : ""}
            {request.feesDue <= 0 ? " · No fee" : ""}
          </>
        }
        badges={
          waitingForReply && (
            <Badge variant="warning">Applicant waiting for a reply</Badge>
          )
        }
        footer={
          <RequestNextBar
            summary={summary}
            plan={plan}
            note={note}
            onNoteChange={setNote}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hasChat && tab === "documents" && (
              <Button variant="outline" onClick={() => setChatOpen(true)}>
                <MessageSquare data-icon="inline-start" aria-hidden="true" />
                Chat <Kbd>{hotkeyLabel(CHAT_HOTKEY)}</Kbd>
              </Button>
            )}
            {canProcess && (plan.primary || plan.secondary.length > 0 || plan.reject) && (
              <RequestClaimControl
                requestId={request.id}
                status={request.status}
                claim={request.claim}
                onUpdated={onUpdated}
              />
            )}
            <RequestActionBar plan={plan} busy={busy} onAction={handleAction} />
          </div>
        }
      />

      <MarriagePostingPanel
        showGuidance={false}
        key={`${request.id}-${request.postingStartDate}`}
        serviceCode={request.serviceCode} status={request.status}
        postingStartDate={request.postingStartDate} postingEndDate={request.postingEndDate}
        editor={ownsStageClaim ? {
          requestId: request.id, updatedAt: request.updatedAt, createdAt: request.createdAt, onSaved: onUpdated,
        } : undefined}
      />

      <ElectronicEndorsementPanel key={JSON.stringify([request.id, request.endorsement])} serviceCode={request.serviceCode}
        status={request.status} details={request.endorsement}
        editor={ownsStageClaim ? { requestId: request.id, updatedAt: request.updatedAt,
          createdAt: request.createdAt, onSaved: onUpdated } : undefined} />

      <RequestHandoffConcerns
        status={request.status}
        logs={request.logs}
        attachments={attachments}
        onViewHistory={() => onTabChange("history")}
      />

      <Tabs value={tab} onValueChange={(value) => onTabChange(value as RequestDetailTab)} className="gap-4">
        <TabsList variant="counted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {attachments.length > 0 && (
              <TabsCount tone={pending > 0 ? "alert" : "default"}>
                {accepted}/{attachments.length}
                <span className="sr-only"> accepted</span>
              </TabsCount>
            )}
          </TabsTrigger>
          {hasChat && (
            <TabsTrigger value="chat">
              Chat
              <TabsCount tone={waitingForReply ? "alert" : "default"}>
                {request.messages.length}
                <span className="sr-only"> messages</span>
              </TabsCount>
            </TabsTrigger>
          )}
          <TabsTrigger value="history">
            History
            <TabsCount>
              {request.logs.length}
              <span className="sr-only"> entries</span>
            </TabsCount>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="flex flex-col gap-4">
            <RequestOverview
              request={request}
              attachments={attachments}
              onOpenDocument={openDocument}
            >
              {/* A request with no fee has nothing to collect until the cashier
                  confirms it at release, so the card appears only then. */}
              {(request.feesDue > 0 || request.status === "ready_for_release" || (request.serviceCode === "DEATH_DELAYED" && request.status === "processing" && request.postingStartDate)) && (
                <PaymentVerificationPanel
                  requestId={request.id}
                  serviceCode={request.serviceCode}
                  postingStartDate={request.postingStartDate}
                  status={request.status}
                  feesDue={request.feesDue}
                  copies={request.copies}
                  paymentStatus={request.paymentStatus}
                  orNumber={request.orNumber}
                  onVerified={() => void onUpdated()}
                />
              )}
            </RequestOverview>
            <VerificationFormCard
              variant="staff"
              trackingNumber={request.trackingNumber}
              copies={request.copies}
              formData={request.formData}
            />
          </div>
        </TabsContent>

        {/* Kept mounted so the selected document and any decision still in its
            undo window survive a visit to another tab. */}
        <TabsContent value="documents" keepMounted>
          <DocumentsWorkbench
            request={request}
            active={tab === "documents"}
            paused={dialog != null || chatOpen}
            canProcess={canProcess}
            canReverse={canReverse}
            handlingBlockedReason={handlingBlockedReason}
            confirmRejections={confirmRejections}
            decisions={decisions}
            selectedId={selectedDocId}
            onSelectedIdChange={setSelectedDocId}
            onDecide={handleAttachmentDecision}
            onRevert={handleAttachmentRevert}
          />
        </TabsContent>

        {hasChat && (
          <TabsContent value="chat">
            <div className="dashboard-panel p-5">
              <RequestMessagesCard
                variant="bare"
                requestId={request.id}
                messages={request.messages}
                suggestions={suggestions}
                viewer="staff"
                onSent={() => void onUpdated()}
              />
            </div>
          </TabsContent>
        )}

        <TabsContent value="history">
          <RequestHistoryLog logs={request.logs} feesDue={request.feesDue} />
        </TabsContent>
      </Tabs>

      <RequestTransitionDialog
        type={dialog}
        busy={busy}
        context={{
          serviceCode: request.serviceCode,
          endorsement: request.endorsement,
          applicantName: request.applicantName,
          originalsAlreadyChecked: hasCurrentOriginalDocumentCheck(request.logs),
          copies: request.copies,
          feesDue: request.feesDue,
          orNumber: request.orNumber,
          attachments,
        }}
        onClose={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
      />

      {hasChat && (
        <RequestChatDrawer
          open={chatOpen}
          onOpenChange={setChatOpen}
          requestId={request.id}
          messages={request.messages}
          suggestions={suggestions}
          onSent={() => void onUpdated()}
        />
      )}
    </div>
  );
}
