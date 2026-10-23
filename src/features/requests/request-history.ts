import { officeDateKey, officeTodayKey } from "~/features/requests/payment-history";
import { getLogNote, getStatusDetails } from "~/features/requests/request-workflow";
import { OFFICE_TIME_ZONE, diffInDays, formatShortDate } from "~/lib/date";

/** An `application_logs` row as the request queries return it (oldest first). */
export interface LogEntry {
  id: string;
  actionStatus: string;
  createdAt: string;
  remarks?: string | null;
  /** Staff view only: the applicant's logs don't carry who acted. */
  actorName?: string;
}

/** "Oct 1, 2026, 08:37 PM" — the full stamp, for a tooltip or a status list. */
export function formatLogDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    timeZone: OFFICE_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "8:37 PM" — the time alone, under a day heading that already has the date. */
export function formatLogTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    timeZone: OFFICE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * A requirement's name is the full instruction ("Valid ID, 1 photocopy with
 * signature", "Duly Accomplished Certificate of Live Birth (4 copies) — secure
 * from the hospital…"). A history row only needs what the document is, so cut
 * at the first comma or spaced dash; the full text stays in a tooltip.
 */
export function shortRequirementName(name: string) {
  const cut = name.search(/,\s|\s[—–]\s/);
  return (cut > 0 ? name.slice(0, cut) : name).trim();
}

export type DocumentEventKind = "approved" | "rejected" | "reopened" | "resubmitted";

interface DocumentLog {
  kind: DocumentEventKind;
  name: string;
  reason: string | null;
}

// The shapes `requests.mutations.ts` and `applicant-requests.mutations.ts` write.
const DOCUMENT_LOGS: { actionStatus: string; kind: DocumentEventKind; pattern: RegExp }[] = [
  { actionStatus: "document_approved", kind: "approved", pattern: /^Approved "(.+)"\.?$/s },
  { actionStatus: "document_rejected", kind: "rejected", pattern: /^Rejected "(.+?)": (.+)$/s },
  {
    actionStatus: "document_reverted",
    kind: "reopened",
    pattern: /^Reopened "(.+?)" \(was \w+\): (.+)$/s,
  },
  {
    actionStatus: "document_resubmitted",
    kind: "resubmitted",
    pattern: /^Applicant resubmitted "(.+)" after rejection\.?$/s,
  },
];

/** Which document a document log is about, and the reason it carries; null for any other log. */
export function parseDocumentLog(actionStatus: string, remarks: string | null | undefined) {
  const spec = DOCUMENT_LOGS.find((entry) => entry.actionStatus === actionStatus);
  if (!spec) return null;
  const match = remarks?.match(spec.pattern);
  const log: DocumentLog = match
    ? { kind: spec.kind, name: match[1], reason: match[2] ?? null }
    : { kind: spec.kind, name: "a document", reason: null };
  return log;
}

export type HistoryKind = DocumentEventKind | "status" | "payment";
export type HistoryTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface HistoryEvent {
  id: string;
  createdAt: string;
  actor: string;
  kind: HistoryKind;
  /** The log's `action_status`: a request status, or a document/payment event name. */
  status: string;
  /** The document a document event is about: short name, and the full requirement text. */
  document: { name: string; full: string } | null;
  /** What follows the sentence: a reason staff typed, or an OR number. Never a canned note. */
  note: string | null;
  /** Payment events only: how the sentence ends, since fee-free and paid read differently. */
  label: string | null;
  tone: HistoryTone;
  /** Worth the eye: everything except routine progress and acceptances. */
  important: boolean;
}

export type HistoryItem =
  | { kind: "event"; event: HistoryEvent }
  /** Consecutive acceptances by one person, newest first. */
  | { kind: "run"; id: string; actor: string; events: HistoryEvent[] };

export interface HistoryDay {
  key: string;
  label: string;
  /** Events in the day, counting those folded into a run. */
  count: number;
  items: HistoryItem[];
}

const ROUTINE_STATUSES = ["submitted", "under_validation"];

const TONE_OF_VARIANT: Record<string, HistoryTone> = {
  info: "info",
  progress: "info",
  success: "success",
  warning: "warning",
  destructive: "danger",
  neutral: "neutral",
};

const DOCUMENT_TONE: Record<DocumentEventKind, HistoryTone> = {
  approved: "success",
  rejected: "danger",
  reopened: "warning",
  resubmitted: "warning",
};

function toEvent(log: LogEntry, feesDue: number): HistoryEvent {
  const base = {
    id: log.id,
    createdAt: log.createdAt,
    actor: log.actorName || "System",
    status: log.actionStatus,
  };

  const doc = parseDocumentLog(log.actionStatus, log.remarks);
  if (doc) {
    return {
      ...base,
      kind: doc.kind,
      document: { name: shortRequirementName(doc.name), full: doc.name },
      note: doc.reason,
      label: null,
      tone: DOCUMENT_TONE[doc.kind],
      important: doc.kind !== "approved",
    };
  }

  if (log.actionStatus === "payment_verified") {
    const feeFree = feesDue <= 0;
    return {
      ...base,
      kind: "payment",
      document: null,
      // The OR number is the point of a paid row; a fee-free one says it all in the label.
      note: feeFree ? null : (log.remarks ?? null),
      label: feeFree ? "confirmed no fee is due" : "verified payment",
      tone: "success",
      important: true,
    };
  }

  // A remark staff typed is worth a line; the canned one only repeats the status.
  const note = getLogNote(log.actionStatus, log.remarks ?? null, "staff", feesDue);
  const canned = getLogNote(log.actionStatus, null, "staff", feesDue);
  return {
    ...base,
    kind: "status",
    document: null,
    note: note && note !== canned ? note : null,
    label: null,
    tone: TONE_OF_VARIANT[getStatusDetails(log.actionStatus).variant] ?? "neutral",
    important: !ROUTINE_STATUSES.includes(log.actionStatus),
  };
}

function dayLabel(key: string, firstIso: string, now: Date) {
  const daysAgo = diffInDays(key, officeTodayKey(now));
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return formatShortDate(firstIso, now);
}

/** Folds each run of 2+ consecutive acceptances by one person into a single item. Oldest first in, newest first out. */
function foldApprovals(events: HistoryEvent[]): HistoryItem[] {
  const items: HistoryItem[] = [];
  let run: HistoryEvent[] = [];

  const flush = () => {
    if (run.length === 1) items.push({ kind: "event", event: run[0] });
    else if (run.length > 1) {
      items.push({ kind: "run", id: run[0].id, actor: run[0].actor, events: [...run].reverse() });
    }
    run = [];
  };

  for (const event of events) {
    if (event.kind !== "approved") {
      flush();
      items.push({ kind: "event", event });
    } else if (run.length > 0 && run[0].actor !== event.actor) {
      flush();
      run.push(event);
    } else {
      run.push(event);
    }
  }
  flush();

  return items.reverse();
}

/**
 * The staff history: logs (oldest first, as the detail query returns them)
 * grouped by day, newest day and newest event first, with runs of accepted
 * documents folded so ten routine clicks don't bury the one rejection.
 */
export function buildHistory(logs: LogEntry[], feesDue: number, now = new Date()): HistoryDay[] {
  const days = new Map<string, HistoryEvent[]>();
  for (const log of logs) {
    const key = officeDateKey(new Date(log.createdAt));
    days.set(key, [...(days.get(key) ?? []), toEvent(log, feesDue)]);
  }

  return [...days].reverse().map(([key, events]) => ({
    key,
    label: dayLabel(key, events[0].createdAt, now),
    count: events.length,
    items: foldApprovals(events),
  }));
}
