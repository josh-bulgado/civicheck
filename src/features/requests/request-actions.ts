/**
 * What a staff member can do with a request right now, and why not.
 *
 * The request page renders from this plan, so a button is never hidden: when
 * an action exists but can't run yet, it comes back with `blocked` and the page
 * shows that reason beside a disabled button. The rules mirror the checks in
 * `advanceRequestStatusFn`; the server stays the authority.
 */
import {
  getStatusDetails,
  getTransitionLabel,
  isPaymentSettled,
  nextStatuses,
  type RequestStatus,
} from "~/features/requests/request-workflow";

/** Actions that need more than a click open one of these first. */
export type TransitionDialog = "incomplete" | "reject" | "release";

export interface PlannedAction {
  to: RequestStatus;
  label: string;
  /** What happens, in one line. */
  effect?: string;
  /** Why this can't run yet. The button is disabled and the page shows this. */
  blocked?: string;
  dialog?: TransitionDialog;
}

export interface RequestActionPlan {
  primary: PlannedAction | null;
  secondary: PlannedAction[];
  reject: PlannedAction | null;
  /** Shown instead of actions when there are none to offer. */
  notice: string | null;
}

export interface RequestActionInput {
  status: string | null;
  paymentStatus: string | null;
  feesDue: number;
  canProcess: boolean;
  attachments: { verificationStatus: string }[];
  /** Encoded at the counter: the applicant and their papers are already there. */
  isWalkIn?: boolean;
}

const DIALOG_OF: Partial<Record<RequestStatus, TransitionDialog>> = {
  incomplete: "incomplete",
  rejected: "reject",
  released: "release",
};

/** The forward step for each status. Anything else is secondary. */
const PRIMARY_OF: Partial<Record<RequestStatus, RequestStatus>> = {
  submitted: "under_validation",
  under_validation: "processing",
  incomplete: "under_validation",
  processing: "ready_for_release",
  ready_for_release: "released",
};

function documentCounts(attachments: RequestActionInput["attachments"]) {
  let pending = 0;
  let rejected = 0;
  let approved = 0;
  for (const doc of attachments) {
    if (doc.verificationStatus === "approved") approved += 1;
    else if (doc.verificationStatus === "rejected") rejected += 1;
    else pending += 1;
  }
  return { pending, rejected, approved, total: attachments.length };
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function effectOf(
  from: string | null,
  to: RequestStatus,
  paymentSettled: boolean,
): string | undefined {
  switch (to) {
    case "under_validation":
      return from === "processing" || from === "ready_for_release"
        ? "Use this when a document turned out to be wrong."
        : "The applicant’s tracker changes to Under Validation.";
    case "processing":
      return "Moves to Processing. The applicant is notified.";
    case "incomplete":
      return "You write what the applicant needs to fix. They are notified.";
    case "ready_for_release":
      return paymentSettled
        ? "Payment is already verified, so release is available right away."
        : "Release stays locked until the cashier verifies payment.";
    case "released":
      return "You confirm the handover first. Release cannot be undone.";
    default:
      return undefined;
  }
}

function blockedReason(
  to: RequestStatus,
  input: RequestActionInput,
  paymentSettled: boolean,
): string | undefined {
  // Processing and everything after it assume every uploaded document is
  // accepted, the same rule advanceRequestStatusFn enforces.
  if (to === "processing" || to === "ready_for_release" || to === "released") {
    const { pending, rejected } = documentCounts(input.attachments);
    if (rejected > 0) {
      return `${plural(rejected, "rejected document")} to resolve first`;
    }
    if (pending > 0) {
      return `${plural(pending, "document")} still ${pending === 1 ? "needs" : "need"} a decision`;
    }
  }
  if (to === "released" && !paymentSettled) {
    return input.feesDue > 0
      ? "Waiting for the cashier to verify payment"
      : "Waiting for the cashier to confirm this fee-free request";
  }
  return undefined;
}

export function planRequestActions(input: RequestActionInput): RequestActionPlan {
  const none = { primary: null, secondary: [], reject: null, notice: null };
  if (!input.canProcess) {
    return { ...none, notice: "Your role can view this request but not advance it." };
  }

  const allowed = nextStatuses(input.status);
  if (allowed.length === 0) {
    return {
      ...none,
      notice: `This request is ${getStatusDetails(input.status).label.toLowerCase()}. Nothing further to do.`,
    };
  }

  const paymentSettled = isPaymentSettled(input.paymentStatus);
  const make = (to: RequestStatus): PlannedAction => ({
    to,
    label: getTransitionLabel(input.status, to),
    effect: effectOf(input.status, to, paymentSettled),
    blocked: blockedReason(to, input, paymentSettled),
    dialog: DIALOG_OF[to],
  });

  const actions = new Map(allowed.map((to) => [to, make(to)]));
  const reject = actions.get("rejected") ?? null;
  actions.delete("rejected");

  // A rejected document means the request can't move on as complete, so the
  // useful step is to send it back. The blocked "complete" action stays listed.
  let primaryTo = input.status ? PRIMARY_OF[input.status as RequestStatus] : undefined;
  if (
    input.status === "under_validation" &&
    documentCounts(input.attachments).rejected > 0 &&
    actions.has("incomplete")
  ) {
    primaryTo = "incomplete";
  }

  const primary = primaryTo ? (actions.get(primaryTo) ?? null) : null;
  if (primaryTo) actions.delete(primaryTo);

  return { primary, secondary: [...actions.values()], reject, notice: null };
}

/**
 * The line under the header: where the request stands and what comes next.
 *
 * Online applicants visit once, at release (CLAUDE.md §4). Validation is the
 * online review of their uploads; the originals are matched against those
 * uploads when the document is claimed. Only a walk-in is at the counter
 * during validation.
 */
export function describeRequestProgress(input: RequestActionInput): string {
  const { pending, rejected, approved, total } = documentCounts(input.attachments);
  switch (input.status) {
    case "submitted":
      return "Nobody has reviewed this yet.";
    case "under_validation":
      if (input.isWalkIn) {
        return "Walk-in. Validate the physical documents at the counter.";
      }
      if (total === 0) {
        return "Nothing was uploaded. Check the submitted details. The originals are checked at release.";
      }
      if (pending === 0 && rejected === 0) {
        return "Every document is accepted. Mark requirements complete. The originals are matched to these uploads at release.";
      }
      return `${approved} accepted · ${pending} pending · ${rejected} rejected`;
    case "incomplete":
      return input.isWalkIn
        ? "Waiting for the applicant to bring what was missing."
        : "Waiting for the applicant to upload what was missing.";
    case "processing":
      return "Prepare the record, then mark it ready for release.";
    case "ready_for_release":
      if (!isPaymentSettled(input.paymentStatus)) {
        return "Prepared. Waiting for the cashier to verify payment.";
      }
      return total > 0
        ? "Paid. Check the claimant’s ID and match the originals to the uploads, then hand over the document."
        : "Paid. Check the claimant’s ID and hand over the document.";
    case "released":
      return "Released. Nothing left to do.";
    case "rejected":
      return "Rejected. Nothing left to do.";
    default:
      return "";
  }
}

/**
 * The notice the applicant gets when a request is sent back, drafted from the
 * documents staff rejected. Staff edit it before it goes out.
 */
export function buildIncompleteNote(
  attachments: {
    requirementName: string;
    subjectRole: string | null;
    verificationStatus: string;
    rejectionReason: string | null;
  }[],
): string {
  return attachments
    .filter((doc) => doc.verificationStatus === "rejected")
    .map((doc) => {
      const name = `${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${doc.requirementName}`;
      return doc.rejectionReason ? `${name}. ${doc.rejectionReason}` : name;
    })
    .join("\n");
}
