import {
  TERMINAL_STATUSES,
  getLogNote,
  getRejectionNotice,
  getStatusDetails,
  isRequestStatus,
  stageOf,
  type RequestStatus,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import { formatPesoFee, formatServiceCode } from "~/features/services/service-utils";
import { formatShortDate } from "~/lib/date";
import type { AttentionItem, CitizenDashboardRequest } from "./types";

const newestFirst = (requests: CitizenDashboardRequest[]) =>
  [...requests].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

const isActive = (r: CitizenDashboardRequest) =>
  !(TERMINAL_STATUSES as string[]).includes(r.status);

/**
 * The one request the dashboard leads with: one waiting on the applicant
 * (incomplete), then one waiting at the cashier (ready for release), then the
 * newest of the rest that is still moving. Null when nothing is in progress.
 */
export function pickHeroRequest(
  requests: CitizenDashboardRequest[],
): CitizenDashboardRequest | null {
  const sorted = newestFirst(requests);

  return (
    sorted.find((r) => r.status === "incomplete") ??
    sorted.find((r) => r.status === "ready_for_release") ??
    sorted.find(isActive) ??
    null
  );
}

/** What the applicant is told about a rejection: the statement, then staff's reason. */
function rejectionNotice(request: CitizenDashboardRequest): string {
  // The logs arrive in no particular order; the shared notice wants oldest first.
  const logs = [...(request.application_logs ?? [])]
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .map((log) => ({ actionStatus: log.action_status, remarks: log.remarks ?? null }));
  return getRejectionNotice(logs);
}

/** The attention card stays short: the dashboard must not scroll. */
export const ATTENTION_SHOWN = 3;
/** Two rows sit under the hero at most; "See all requests" has the rest. */
export const OTHER_REQUESTS_SHOWN = 2;

export interface DashboardPlan {
  hero: CitizenDashboardRequest | null;
  attention: AttentionItem[];
  /**
   * Under the hero: the other requests still moving. With no hero there is
   * nothing moving, so: the latest finished ones.
   */
  rows: CitizenDashboardRequest[];
  rowsHeading: "Your other requests" | "Recent requests";
  /** Something the dashboard left out, so the applicant is pointed at the full list. */
  hasMore: boolean;
}

/**
 * What the applicant dashboard shows, from every request they have. The hero
 * is the one needing them most (see `pickHeroRequest`), not the newest. Next
 * come the others that need them: incomplete, then waiting at the cashier,
 * then a rejection they have not opened yet (`unreadRequestIds` is the same
 * unread state the sidebar badge reads, cleared when the request is opened).
 * What is left fills two rows, still-moving requests only. Finished requests
 * appear only when nothing is moving, so they never crowd out one that is.
 */
export function dashboardPlan(
  requests: CitizenDashboardRequest[],
  unreadRequestIds: ReadonlySet<string> = new Set(),
): DashboardPlan {
  const hero = pickHeroRequest(requests);
  // The hero already speaks for its own request, so only the others are listed.
  const others = newestFirst(requests).filter((request) => request.id !== hero?.id);

  const candidates: AttentionItem[] = [
    ...others
      .filter((r) => r.status === "incomplete")
      .map((request) => ({
        request,
        tone: "warning" as const,
        message: "Missing requirements. Resubmit so validation can continue.",
        action: "Upload docs",
      })),
    ...others
      .filter((r) => r.status === "ready_for_release" && r.payment_status !== "verified")
      .map((request) => ({
        request,
        tone: "success" as const,
        // A fee-free request has nothing to pay, only a visit to confirm.
        message:
          Number(request.fees_due ?? 0) > 0
            ? `${formatPesoFee(request.fees_due)} due. Pay and claim at the CCRO cashier.`
            : heroNote(request),
        action: "View details",
      })),
    ...others
      .filter((r) => r.status === "rejected" && unreadRequestIds.has(r.id))
      .map((request) => ({
        request,
        tone: "warning" as const,
        message: rejectionNotice(request),
        action: "View details",
      })),
  ];
  const attention = candidates.slice(0, ATTENTION_SHOWN);

  // Anything the attention card already names is not listed a second time. One
  // it had no room for rejoins the rows if it is still moving.
  const named = new Set(attention.map((item) => item.request.id));
  const pool = others.filter(
    (request) => !named.has(request.id) && (hero === null || isActive(request)),
  );
  const rows = pool.slice(0, OTHER_REQUESTS_SHOWN);

  // A rejection cut from the card is finished, so no row picks it up either.
  const droppedRejection = candidates
    .slice(ATTENTION_SHOWN)
    .some((item) => !isActive(item.request));

  return {
    hero,
    attention,
    rows,
    rowsHeading: hero ? "Your other requests" : "Recent requests",
    hasMore: pool.length > rows.length || droppedRejection,
  };
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

/** A fee is due and the cashier has not verified it yet. A free request never owes. */
function owesPayment(request: CitizenDashboardRequest): boolean {
  return Number(request.fees_due ?? 0) > 0 && request.payment_status !== "verified";
}

// Release repeats the physical check: documents are screened online, but the
// originals still go across the counter. Money is mentioned only when a fee is
// owed, so the applicant knows to bring it; a free or already paid request says
// nothing about payment.
function trackerNote(request: CitizenDashboardRequest): string | null {
  if (request.status === "incomplete") return "One more document needed";
  if (request.status === "ready_for_release") {
    return owesPayment(request)
      ? `Bring your original documents and ${formatPesoFee(request.fees_due)} to pay at the CCRO counter`
      : "Bring your original documents to the CCRO counter";
  }
  return getLogNote(request.status, null, "applicant", Number(request.fees_due ?? 0));
}

function trackerTag(request: CitizenDashboardRequest): TrackerDetails["tag"] {
  if (request.status === "incomplete") return { label: "Action needed", tone: "action" };
  if (request.status === "ready_for_release" && owesPayment(request)) {
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
