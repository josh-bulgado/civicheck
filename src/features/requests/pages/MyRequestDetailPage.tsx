import { CancelRequestCard } from "../components/CancelRequestCard";
import { RegistrationDeadlineCard } from "../components/RegistrationDeadlineCard";
import { onTimeRegistrationNotice } from "../on-time-registration";
import { separateRegistrationNotice } from "../separate-registration-notice";
import { canCancelCtcRequest } from "../request-cancellation";
import { MarriagePostingPanel } from "../components/MarriagePostingPanel";
import { staggerStyle } from "~/components/motion/stagger";
import type { MyRequestDetail } from "~/features/requests/applicant-requests.queries";
import { MyRequestDocumentsCard } from "~/features/requests/components/MyRequestDocumentsCard";
import { MyRequestHeader } from "~/features/requests/components/MyRequestHeader";
import { NextStepsCard } from "~/features/requests/components/NextStepsCard";
import { RequestMessagesCard } from "~/features/requests/components/RequestMessagesCard";
import { RequestStatusHistory } from "~/features/requests/components/RequestStatusHistory";
import { MyRequestSummary } from "~/features/requests/components/MyRequestSummary";
import { VerificationFormCard } from "~/features/requests/components/VerificationFormCard";
import { isClosedRequestStatus } from "~/features/requests/document-review";
import { nextSteps } from "~/features/requests/next-steps";
import { getRejectionNotice } from "~/features/requests/request-workflow";
import { RequestFeedbackCard } from "~/features/feedback/components/RequestFeedbackCard";

interface MyRequestDetailPageProps {
  request: MyRequestDetail;
  /** Called after a mutation succeeds, so the route can re-run its loader. */
  onUpdated: () => void;
  feedbackRequested?: boolean;
  onFeedbackRequestHandled?: () => void;
}

export default function MyRequestDetailPage({
  request,
  onUpdated,
  feedbackRequested = false,
  onFeedbackRequestHandled = () => {},
}: MyRequestDetailPageProps) {
  const next = nextSteps({
    endorsement: request.endorsement,
    postingStartDate: request.postingStartDate,
    status: request.status,
    serviceCode: request.serviceCode,
    formData: request.formData,
    paymentStatus: request.paymentStatus,
    feesDue: request.feesDue,
    allowsMessages: request.allowsMessages,
    attachments: request.attachments,
    logs: request.logs,
  });

  const registrationNotice = ["submitted", "under_validation", "incomplete", "processing"].includes(request.status)
    ? onTimeRegistrationNotice(request.serviceCode, request.formData, undefined, request.status !== "processing")
    : null;
  const actionOnly = separateRegistrationNotice(next, registrationNotice);
  const deadlineNotice = registrationNotice?.split("\n").filter((line) => !line.startsWith("Wait for")).join("\n");

  return (
    <div key={request.id} className="portal-page @container gap-5 md:gap-6">
      <div className="civic-enter-sm">
        <MyRequestHeader
          serviceName={request.serviceName}
          trackingNumber={request.trackingNumber}
          note={request.status === "cancelled" ? "You cancelled this request. To continue, submit a new request. It will have a new tracking number." : request.status === "rejected" ? getRejectionNotice(request.logs) : null}
        />
      </div>

      <div className="civic-stagger grid min-w-0 grid-cols-1 items-start gap-5 md:gap-6 @4xl:grid-cols-[minmax(0,1fr)_22rem] @4xl:grid-rows-[auto_1fr] @5xl:grid-cols-[minmax(0,1fr)_24rem] @6xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="flex min-w-0 flex-col gap-5 md:gap-6" style={staggerStyle(0, 60)}>
          <NextStepsCard status={request.status} next={actionOnly} />
          {request.status === "released" && <RequestFeedbackCard requestId={request.id} feedback={request.feedback}
            feedbackUnavailable={request.feedbackUnavailable}
            requested={feedbackRequested} onRequestHandled={onFeedbackRequestHandled} onUpdated={onUpdated} />}
          <MarriagePostingPanel serviceCode={request.serviceCode} status={request.status}
            postingStartDate={request.postingStartDate} postingEndDate={request.postingEndDate} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 md:gap-6 @4xl:col-start-1 @4xl:row-start-2" style={staggerStyle(2, 60)}>
          <MyRequestDocumentsCard
            requestId={request.id}
            documents={request.attachments}
            addable={request.addableUploads}
            closed={isClosedRequestStatus(request.status)}
            onChanged={onUpdated}
          />
          {canCancelCtcRequest(request.status, request.serviceCode, request.formData) && (
            <CancelRequestCard requestId={request.id} onCancelled={onUpdated} />
          )}
        </div>

        <div className="@container flex min-w-0 flex-col gap-5 md:gap-6 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1" style={staggerStyle(1, 60)}>
          {deadlineNotice ? <RegistrationDeadlineCard notice={deadlineNotice} /> : null}
          <MyRequestSummary request={request} />
          <RequestStatusHistory logs={request.logs} />
          <VerificationFormCard
            trackingNumber={request.trackingNumber}
            copies={request.copies}
            formData={request.formData}
          />
          {request.allowsMessages && (
            <RequestMessagesCard requestId={request.id} messages={request.messages}
              viewer="applicant" onSent={onUpdated} variant="portal" />
          )}
        </div>
      </div>
    </div>
  );
}
