import {
  TERMINAL_STATUSES,
  getLogNote,
  getStatusDetails,
  isRequestStatus,
  stageOf,
  type RequestStatus,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
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
 * The tail of "Your {service} … ": the verb, then the words set in a heavier
 * weight. An incomplete request says what is wanted, not just that it is
 * incomplete.
 */
export function heroHeadline(status: string): { verb: "is" | "needs"; emphasis: string } {
  if (status === "incomplete") return { verb: "needs", emphasis: "one more document" };
  return { verb: "is", emphasis: heroHeadlineWord(status) };
}

/** The hero's button: what the applicant can do about it right here. */
export function heroActionLabel(status: string): string {
  return status === "incomplete" ? "Upload document" : "View request";
}

/**
 * What the headline calls the service: the short name when an admin set one,
 * else the display name ("Marriage License"), else the registry name. It reads mid-sentence, so
 * every Title Case word drops to lowercase, hyphenated and slashed parts
 * included; acronyms such as "BRAP" or "PSA" stay as typed.
 */
export function heroServiceLabel(request: CitizenDashboardRequest): string {
  const service = request.services_registry;
  const name: string =
    request.short_name ||
    service?.display_name ||
    service?.name ||
    request.request_type ||
    "request";

  return name.replace(/[A-Za-z]+/g, (word) =>
    /^[A-Z][a-z]+$/.test(word) ? word.toLowerCase() : word,
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

export function trackerDetails(request: CitizenDashboardRequest): TrackerDetails {
  return {
    dates: stageDates(request),
    note: trackerNote(request),
    tag: trackerTag(request),
  };
}
