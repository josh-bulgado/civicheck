import { onTimeRegistrationNotice } from "./on-time-registration";
import { getLogNote } from "~/features/requests/request-workflow";
import { readyForReleaseInstruction } from "~/features/services/release-instructions";

/** What the applicant is told to do next on their request page. */
export type NextStepsView =
  | { kind: "steps"; steps: string[]; registrationNotice?: string }
  | { kind: "line"; text: string };

interface NextStepsInput {
  postingStartDate?: string | null;
  status: string;
  serviceCode?: string | null;
  formData?: Record<string, unknown>;
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



/**
 * Digital validation does not replace the physical check, so once a request is
 * processing, applicants bring hard copies for final validation.
 *
 * Null for a request that has ended (released or rejected): there is no next.
 */
export function nextSteps(input: NextStepsInput): NextStepsView | null {
  const { status } = input;

  if (status === "released" || status === "rejected" || status === "cancelled") return null;

  const registrationNotice = onTimeRegistrationNotice(input.serviceCode, input.formData);
  const notice = registrationNotice ? { registrationNotice } : {};

  // Requirements accepted online; the hard copies still need the final check.
  if (status === "processing") {
    return {
      kind: "steps",
      ...notice,
      steps: [
        "Go to the CCRO office for final validation",
        "Bring your original documents and hard copies of your requirements",
        "Bring your tracking number (a printout of your acknowledgment, or write it down)",
        ...(input.serviceCode === "DEATH_DELAYED" && input.postingStartDate
          ? [input.paymentStatus === "verified"
            ? "Payment is verified. Wait for the posting period and registration to finish before claiming."
            : "Pay at the CCRO cashier, then wait for the posting period and registration to finish before claiming."]
          : []),
      ],
    };
  }

  if (status === "under_validation") {
    const subject = input.allowsMessages ? "your inquiry" : "your uploaded documents";
    const instruction = `CCRO is currently reviewing ${subject}. We’ll notify you of updates or needed corrections.`;
    return { kind: "line", text: registrationNotice ? `${instruction}\n\n${registrationNotice}` : instruction };
  }

  if (
    status === "submitted" &&
    registrationNotice
  ) {
    return { kind: "line", text: registrationNotice };
  }

  if (status === "submitted") {
    return {
      kind: "line",
      text: input.allowsMessages
        ? "No need to visit yet. Your inquiry is awaiting staff review."
        : "No need to visit yet. Your uploaded requirements are awaiting staff review.",
    };
  }

  if (status === "ready_for_release") {
    // Staff have completed the office check, so the countdown stops here.
    // An inquiry is answered in the thread: no visit, so no originals.
    if (input.allowsMessages) {
      return { kind: "steps", steps: ["Read CCRO's reply in the messages"] };
    }
    return {
      kind: "steps",
      steps: [readyForReleaseInstruction(input.paymentStatus, input.feesDue)],
    };
  }

  if (status === "incomplete") {
    const rejected = input.attachments.find(
      (doc) => doc.verificationStatus === "rejected",
    );
    if (rejected) {
      const role = rejected.subjectRole ? `${rejected.subjectRole}: ` : "";
      return { kind: "line", text: `${role}${rejected.requirementName}${registrationNotice ? `. ${registrationNotice}` : ""}` };
    }
    // Nothing was rejected file by file, so say what staff said.
    const sentBack = [...input.logs]
      .reverse()
      .find((log) => log.actionStatus === "incomplete");
    const note = getLogNote("incomplete", sentBack?.remarks ?? null, "applicant");
    if (note) return { kind: "line", text: registrationNotice ? `${note} ${registrationNotice}` : note };
  }

  if (registrationNotice && status === "incomplete") return { kind: "line", text: registrationNotice };

  // Wait until processing unless another instruction applies.
  return {
    kind: "line",
    text: "No need to visit yet. We'll notify you when it's ready for release.",
  };
}
