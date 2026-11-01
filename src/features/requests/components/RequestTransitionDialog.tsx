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
} from "~/features/requests/request-actions";
import { REQUEST_REJECTION_REASONS } from "~/features/requests/rejection-reasons";

interface RequestContext {
  serviceCode: string;
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
  onConfirm: (note: string) => void;
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
 * Release is final, so the checks it depends on are ticked on purpose. It is
 * also the applicant's one visit, so it is where the originals are matched to
 * the documents accepted online.
 */
function ReleaseForm({ busy, context, onConfirm }: FormProps) {
  const idPrefix = useId();
  const isEmailInquiry = context.serviceCode === "EMAIL_INQUIRY";
  const copies = `${context.copies} ${context.copies === 1 ? "copy" : "copies"}`;
  const uploads = context.attachments.length;
  const items = [
    isEmailInquiry
      ? `I verified that the uploaded valid ID belongs to the requester, ${context.applicantName}.`
      : `I checked the claimant’s valid ID against the requester, ${context.applicantName}.`,
    ...(uploads > 0
      ? [
          isEmailInquiry
            ? `I reviewed the ${uploads} uploaded ${uploads === 1 ? "file" : "files"} and confirmed ${uploads === 1 ? "it supports" : "they support"} this inquiry.`
            : `The original documents match the ${uploads} uploaded ${uploads === 1 ? "file" : "files"} accepted online.`,
        ]
      : []),
    isEmailInquiry
      ? context.feesDue > 0
        ? `Payment is verified under OR ${context.orNumber ?? "-"}.`
        : "The cashier confirmed no fee was due."
      : context.feesDue > 0
        ? `I am handing over ${copies}. Payment is verified under OR ${context.orNumber ?? "-"}.`
        : `I am handing over ${copies}. The cashier confirmed no fee was due.`,
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
          onClick={() => onConfirm("")}
        >
          {isEmailInquiry ? "Complete inquiry" : "Release document"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

const FORMS = {
  incomplete: IncompleteForm,
  reject: RejectForm,
  release: ReleaseForm,
} satisfies Record<TransitionDialog, (props: FormProps) => React.ReactNode>;

/**
 * The three steps that ask for more than a click: marking incomplete, rejecting
 * and releasing. Each form owns its own state, so it starts fresh every time the
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
  onConfirm: (type: TransitionDialog, note: string) => void;
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
            busy={busy}
            context={context}
            onConfirm={(note) => onConfirm(type, note)}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
