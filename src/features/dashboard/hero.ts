import {
  TERMINAL_STATUSES,
  getLogNote,
  getStatusDetails,
  isRequestStatus,
  stageOf,
  type RequestStatus,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import { formatServiceCode } from "~/features/services/service-utils";
import { formatShortDate } from "~/lib/date";
import type { CitizenDashboardRequest } from "./types";

/**
 * The one request the dashboard leads with: one waiting on the applicant
 * (incomplete), then one waiting at the cashier (ready for release), then the
 * newest of the rest that is still moving. Null when nothing is in progress.
 */
export function pickHeroRequest(
  requests: CitizenDashboardRequest[],
): CitizenDashboardRequest | null {
  const newestFirst = [...requests].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const isActive = (r: CitizenDashboardRequest) =>
    !(TERMINAL_STATUSES as string[]).includes(r.status);

  return (
    newestFirst.find((r) => r.status === "incomplete") ??
    newestFirst.find((r) => r.status === "ready_for_release") ??
    newestFirst.find(isActive) ??
    null
  );
}

// Finishes "Your … is ___". Phrased as a state of the document, so the tracker
// under it can carry the detail.
const HEADLINE_WORD: Record<RequestStatus, string> = {
  submitted: "received",
  under_validation: "under review",
  incomplete: "incomplete",
  rejected: "rejected",
  processing: "being processed",
  ready_for_release: "ready",
  released: "released",
};

export function heroHeadlineWord(status: string): string {
  return isRequestStatus(status)
    ? HEADLINE_WORD[status]
    : getStatusDetails(status).label.toLowerCase();
}

/**
 * The tail of "Your {service} … ": the verb, then the words set in blue. An
 * incomplete request says what is wanted, not just that it is incomplete. A
 * submitted or processing request does not use this: see `heroLead`.
 */
export function heroHeadline(status: string): {
  verb: "is" | "needs";
  emphasis: string;
} {
  if (status === "incomplete") return { verb: "needs", emphasis: "one more document" };
  return { verb: "is", emphasis: heroHeadlineWord(status) };
}

/**
 * For the states that say where the request stands outright, in a short plain
 * headline, and name the document on the line under it, in place of "Your
 * {service} is …". Null for the rest. `serviceLabel` is already cut to length.
 */
export function heroLead(
  status: string,
  serviceLabel: string,
): { headline: string; line: string } | null {
  if (status === "submitted") {
    return {
      headline: "Your request has been submitted",
      line: `${serviceLabel} application is in review.`,
    };
  }
  if (status === "processing") {
    return {
      headline: "Your request is being processed",
      line: `${serviceLabel} application is being prepared.`,
    };
  }
  return null;
}

/** The hero's button: what the applicant can do about it right here. */
export function heroActionLabel(status: string): string {
  return status === "incomplete" ? "Upload document" : "View request";
}

/**
 * What the headline calls the service: the short name when an admin set one,
 * else the display name ("Marriage License"), else the registry name. It keeps
 * its own capitals ("Your On-Time Registration of Certificate of Live Birth
 * is ready"): it is a document's name, not a common noun. A bare request type
 * is a code ("MARRIAGE_LICENSE"), so that one is humanized.
 */
export function heroServiceLabel(request: CitizenDashboardRequest): string {
  const service = request.services_registry;
  return (
    request.short_name ||
    service?.display_name ||
    service?.name ||
    (request.request_type ? formatServiceCode(request.request_type) : "") ||
    "request"
  );
}

/**
 * The line a ready-for-release item carries in the attention card: the same
 * status note the request's timeline uses, minus its first sentence, which the
 * card's own title already says.
 */
export function heroNote(request: CitizenDashboardRequest): string {
  const note =
    getLogNote(request.status, null, "applicant", Number(request.fees_due ?? 0)) ?? "";
  return note.replace(/^Your document is ready\.\s*/, "");
}

export interface TrackerDetails {
  /** Short date each finished stage was completed on, by stage. */
  dates: Partial<Record<WorkflowStage, string>>;
  /** One line about the stage the request is in. */
  note: string | null;
  /** `action` is red: the applicant has something to do. */
  tag: { label: string; tone: "info" | "action" } | null;
}

/**
 * Submission is complete the day it is made. Every later stage is complete the
 * first time the log shows the request in a stage after it (validation ends
 * when processing starts). No log entry, no date: better blank than guessed.
 */
function stageDates(request: CitizenDashboardRequest): TrackerDetails["dates"] {
  const current = stageOf(request.status) ?? 1;
  const logs = [...(request.application_logs ?? [])].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );
  const dates: TrackerDetails["dates"] = {};

  for (const stage of [1, 2, 3] as const) {
    if (stage >= current) break;
    const reached =
      stage === 1
        ? request.created_at
        : logs.find((log) => (stageOf(log.action_status) ?? 0) > stage)?.created_at;
    const date = reached ? formatShortDate(reached) : "";
    if (date) dates[stage] = date;
  }
  return dates;
}

// Release repeats the physical check: documents are screened online, but the
// originals still go across the counter.
function trackerNote(request: CitizenDashboardRequest): string | null {
  if (request.status === "incomplete") return "One more document needed";
  if (request.status === "ready_for_release") {
    return "Bring your original documents to the CCRO counter";
  }
  return getLogNote(request.status, null, "applicant", Number(request.fees_due ?? 0));
}

function trackerTag(request: CitizenDashboardRequest): TrackerDetails["tag"] {
  if (request.status === "incomplete") return { label: "Action needed", tone: "action" };
  const owes = Number(request.fees_due ?? 0) > 0 && request.payment_status !== "verified";
  if (request.status === "ready_for_release" && owes) {
    return { label: "Pay at cashier", tone: "info" };
  }
  return null;
}

/**
 * The line under each stage's label on the hero's tracker. A just submitted
 * request says what happened; a later one gives the date each finished stage
 * was completed, and the note for the stage it is in.
 */
export function leadCaptions(
  request: CitizenDashboardRequest,
  details: TrackerDetails = trackerDetails(request),
): Partial<Record<WorkflowStage, string>> {
  if (request.status === "submitted") return { 1: "Application received" };

  const { dates, note } = details;
  const captions: Partial<Record<WorkflowStage, string>> = { ...dates };
  const stage = stageOf(request.status);
  if (stage && note) captions[stage] = note;
  return captions;
}

export function trackerDetails(request: CitizenDashboardRequest): TrackerDetails {
  return {
    dates: stageDates(request),
    note: trackerNote(request),
    tag: trackerTag(request),
  };
}
