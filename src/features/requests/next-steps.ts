import { getLogNote } from "~/features/requests/request-workflow";
import { formatPesoFee } from "~/features/services/service-utils";

/** What the applicant is told to do next on their request page. */
export type NextStepsView =
  | { kind: "steps"; steps: string[] }
  | { kind: "line"; text: string };

interface NextStepsInput {
  status: string;
  paymentStatus: string | null;
  feesDue: number;
  allowsMessages: boolean;
  attachments: {
    requirementName: string;
    subjectRole: string | null;
    verificationStatus: string;
  }[];
  logs: { actionStatus: string; remarks: string | null }[];
}

const ORIGINALS = "Bring your original documents";

/**
 * Digital validation does not replace the physical check, so once a request is
 * ready the visit always starts with the originals. Before that there is
 * nothing to do but wait, except when staff have sent something back.
 *
 * Null for a request that has ended (released or rejected): there is no next.
 */
export function nextSteps(input: NextStepsInput): NextStepsView | null {
  const { status } = input;

  if (status === "released" || status === "rejected") return null;

  if (status === "ready_for_release") {
    // An inquiry is answered in the thread: no visit, so no originals.
    if (input.allowsMessages) {
      return { kind: "steps", steps: ["Read CCRO's reply in the messages"] };
    }
    if (input.feesDue <= 0) {
      return { kind: "steps", steps: [ORIGINALS, "Claim your document at the CCRO"] };
    }
    // Already paid: nothing more to say about money.
    if (input.paymentStatus === "verified") {
      return { kind: "steps", steps: [ORIGINALS, "Claim your document"] };
    }
    return {
      kind: "steps",
      steps: [
        ORIGINALS,
        `Bring ${formatPesoFee(input.feesDue)} to pay at the counter`,
        "Claim your document",
      ],
    };
  }

  if (status === "incomplete") {
    const rejected = input.attachments.find(
      (doc) => doc.verificationStatus === "rejected",
    );
    if (rejected) {
      const role = rejected.subjectRole ? `${rejected.subjectRole}: ` : "";
      return { kind: "line", text: `${role}${rejected.requirementName}` };
    }
    // Nothing was rejected file by file, so say what staff said.
    const sentBack = [...input.logs]
      .reverse()
      .find((log) => log.actionStatus === "incomplete");
    const note = getLogNote("incomplete", sentBack?.remarks ?? null, "applicant");
    if (note) return { kind: "line", text: note };
  }

  return { kind: "line", text: "We'll notify you when this changes." };
}
