import { useId, useState } from "react";
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
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  RejectionReasonPicker,
  useRejectionReason,
} from "~/features/requests/components/RejectionReasonPicker";
import {
  buildIncompleteNote,
  type TransitionDialog,
  type TransitionConfirmations,
} from "~/features/requests/request-actions";
import { needsOriginalDocumentCheck } from "~/features/requests/request-workflow";
import { REQUEST_REJECTION_REASONS } from "~/features/requests/rejection-reasons";
import { endorsementClaimingSteps, type EndorsementDetails } from "../electronic-endorsement-release";

interface RequestContext {
  isWalkIn?: boolean;
  endorsement?: EndorsementDetails | null;
  serviceCode: string;
  originalsAlreadyChecked?: boolean;
  applicantName: string;
  copies: number;
  feesDue: number;
  orNumber: string | null;
  attachments: {
    requirementName: string;
    subjectRole: string | null;
    verificationStatus: string;
    rejectionReason: string | null;
  }[];
}

interface FormProps {
  busy: boolean;
  context: RequestContext;
  /** `note` is the message the applicant sees, or the history note for release. */
  onConfirm: (note: string, confirmations?: TransitionConfirmations) => void;
}

/** The notice the applicant gets, drafted from the rejected documents. */
function IncompleteForm({ busy, context, onConfirm }: FormProps) {
  const fieldId = useId();
  const [note, setNote] = useState(() => buildIncompleteNote(context.attachments));

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Mark this request incomplete?</AlertDialogTitle>
        <AlertDialogDescription>
          The applicant sees this message. It is drafted from the documents you
          rejected. Edit it so it is clear what to fix or upload again.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId} className="sr-only">
          Message to the applicant
        </Label>
        <Textarea
          id={fieldId}
          rows={5}
          autoFocus
          disabled={busy}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What does the applicant need to fix or upload again?"
        />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={busy || !note.trim()}
          onClick={() => onConfirm(note.trim())}
        >
          Mark incomplete
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

function RejectForm({ busy, onConfirm }: FormProps) {
  const rejection = useRejectionReason();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Reject this request?</AlertDialogTitle>
        <AlertDialogDescription>
          This ends the request. The applicant sees the reason.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <RejectionReasonPicker
        idPrefix="request-reject"
        legend="Why is this request being rejected?"
        reasons={REQUEST_REJECTION_REASONS}
        state={rejection}
        disabled={busy}
      />
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={busy || !rejection.reason}
          onClick={() => onConfirm(rejection.reason)}
        >
          Reject request
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

/**
 * Release is final, so staff confirm the claimant's authority and the handover.
 */
function ReleaseForm({ busy, context, onConfirm }: FormProps) {
  const idPrefix = useId();
  const isEmailInquiry = context.serviceCode === "EMAIL_INQUIRY";
  const needsOriginals = needsOriginalDocumentCheck(
    context.serviceCode, "released", context.originalsAlreadyChecked,
  );
  const copies = `${context.copies} ${context.copies === 1 ? "copy" : "copies"}`;
  const uploads = context.attachments.length;
  const items = isEmailInquiry ? [
    `I verified that the uploaded valid ID belongs to the requester, ${context.applicantName}.`,
    ...(uploads > 0
      ? [
          `I reviewed the ${uploads} uploaded ${uploads === 1 ? "file" : "files"} and confirmed ${uploads === 1 ? "it supports" : "they support"} this inquiry.`,
        ]
      : []),
    context.feesDue > 0
        ? `Payment is verified under OR ${context.orNumber ?? "-"}.`
        : "The cashier confirmed no fee was due.",
  ] : [
    ...(needsOriginals
      ? [context.isWalkIn
          ? "I checked the originals and hard copies against the submitted details."
          : "I checked the originals and hard copies against the submitted details and any uploaded copies."]
      : []),
    "I verified the claimant’s identity and authority to receive the document.",
    context.serviceCode === "ELEC_ENDORSEMENT"
      ? "I confirmed that the applicant received the final PSA certificate."
      : `I am handing over ${copies} to the claimant.`,
  ];
  const [checked, setChecked] = useState(() => items.map(() => false));

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{isEmailInquiry ? "Complete this inquiry?" : "Release this document?"}</AlertDialogTitle>
        <AlertDialogDescription>
          {isEmailInquiry
            ? "Completion is final and goes on the record under your name."
            : "Release is final and goes on the record under your name."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex flex-col gap-3">
        {items.map((text, index) => (
          <div key={text} className="flex items-start gap-3">
            <Checkbox
              id={`${idPrefix}-${index}`}
              checked={checked[index]}
              disabled={busy}
              onCheckedChange={(value) =>
                setChecked((current) =>
                  current.map((was, i) => (i === index ? value === true : was)),
                )
              }
              className="mt-0.5"
            />
            <Label htmlFor={`${idPrefix}-${index}`} className="leading-snug">
              {text}
            </Label>
          </div>
        ))}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={busy || !checked.every(Boolean)}
          onClick={() => {
            const identityIndex = isEmailInquiry || !needsOriginals ? 0 : 1;
            onConfirm("", {
              originalsConfirmed: needsOriginals && checked[0] === true,
              identityVerified: checked[identityIndex] === true,
              handoverConfirmed: !isEmailInquiry && checked[identityIndex + 1] === true,
            });
          }}
        >
          {isEmailInquiry ? "Complete inquiry" : "Release document"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

function OriginalsForm({ busy, context, onConfirm }: FormProps) {
  const checkboxId = useId();
  const [checked, setChecked] = useState(false);
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirm you checked the originals</AlertDialogTitle>
        <AlertDialogDescription>
          Check the originals and hard copies for {context.applicantName} before
          marking this request ready for release. Your confirmation is recorded in History.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex items-start gap-3">
        <Checkbox
          id={checkboxId}
          checked={checked}
          disabled={busy}
          onCheckedChange={(value) => setChecked(value === true)}
          className="mt-0.5"
        />
        <Label htmlFor={checkboxId} className="leading-snug">
          {context.isWalkIn
            ? "I checked the originals and hard copies against the submitted details."
            : "I checked the originals and hard copies against the submitted details and any uploaded copies."}
        </Label>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={busy || !checked} onClick={() => onConfirm("", { originalsConfirmed: checked })}>
          Mark ready for release
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

function ReturnForm({ busy, onConfirm }: FormProps) {
  const fieldId = useId();
  const [reason, setReason] = useState("");
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Return this request to validation?</AlertDialogTitle>
        <AlertDialogDescription>
          Explain what needs rechecking. The reason is recorded in History and
          shared with the applicant. Accepted document decisions stay accepted
          until a supervisor or admin reopens them.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId}>Reason for returning</Label>
        <Textarea id={fieldId} rows={4} disabled={busy} value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Which document or detail needs rechecking, and why?" />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={busy || !reason.trim()} onClick={() => onConfirm(reason.trim())}>
          Return to validation
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

function CourtForm({ busy, onConfirm }: FormProps) {
  const checkboxId = useId();
  const [checked, setChecked] = useState(false);
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Verify the issuing court</AlertDialogTitle>
        <AlertDialogDescription>
          The issuing court was not confirmed in the application. Check the
          decision before completing validation. If a court outside RTC Legazpi
          issued it, verify the Certificate of Registration and Authenticity
          from the Local Civil Registrar where that court is located. Mark the
          request incomplete if this certificate is missing.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex items-start gap-3">
        <Checkbox id={checkboxId} checked={checked} disabled={busy}
          onCheckedChange={(value) => setChecked(value === true)} />
        <Label htmlFor={checkboxId} className="leading-snug">
          I verified the issuing court and the additional certificate, if required.
        </Label>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={busy || !checked}
          onClick={() => onConfirm("", { courtIssuerConfirmed: checked })}>
          Move to processing
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

function EndorsementForm({ busy, context, onConfirm }: FormProps) {
  const id = useId();
  const [checked, setChecked] = useState(false);
  return <>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm PSA certificate availability</AlertDialogTitle>
      <AlertDialogDescription>Mark ready only when the final PSA certificate is available. The applicant will receive these claiming instructions.</AlertDialogDescription>
    </AlertDialogHeader>
    <section className="space-y-2 text-sm" aria-label="Instructions the applicant will receive">
      <h3 className="font-medium">Instructions the applicant will receive</h3>
      <blockquote className="space-y-2 whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 p-3 leading-relaxed">
        {endorsementClaimingSteps(context.endorsement).map(step => <p key={step}>{step}</p>)}
      </blockquote>
    </section>
    <div className="flex items-start gap-3">
      <Checkbox id={id} checked={checked} disabled={busy} onCheckedChange={value => setChecked(value === true)} />
      <Label htmlFor={id} className="leading-snug">I confirmed that the final PSA certificate is available for collection.</Label>
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
      <AlertDialogAction disabled={busy || !checked} onClick={() => onConfirm("", { psaCertificateAvailableConfirmed: checked })}>Mark ready for release</AlertDialogAction>
    </AlertDialogFooter>
  </>;
}

const FORMS = {
  endorsement: EndorsementForm,
  court: CourtForm,
  return: ReturnForm,
  originals: OriginalsForm,
  incomplete: IncompleteForm,
  reject: RejectForm,
  release: ReleaseForm,
} satisfies Record<TransitionDialog, (props: FormProps) => React.ReactNode>;

/**
 * Steps that need confirmation: checking originals, marking incomplete,
 * rejecting and releasing. Each form owns its own state, so it starts fresh every time the
 * dialog opens. Cancel is focused first for reject and release, so a stray Enter
 * cannot fire either.
 */
export function RequestTransitionDialog({
  type,
  busy,
  context,
  onClose,
  onConfirm,
}: {
  type: TransitionDialog | null;
  busy: boolean;
  context: RequestContext;
  onClose: () => void;
  onConfirm: (type: TransitionDialog, note: string, confirmations?: TransitionConfirmations) => void;
}) {
  const Form = type ? FORMS[type] : null;

  return (
    <AlertDialog
      open={type != null}
      onOpenChange={(open) => !open && !busy && onClose()}
    >
      <AlertDialogContent>
        {type && Form && (
          <Form
            key={type === "release" ? String(context.originalsAlreadyChecked) : type}
            busy={busy}
            context={context}
            onConfirm={(note, confirmations) => onConfirm(type, note, confirmations)}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
