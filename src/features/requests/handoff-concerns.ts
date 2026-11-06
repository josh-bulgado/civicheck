import { parseDocumentLog, type LogEntry } from "./request-history";
import { isRequestStatus } from "./request-workflow";

export interface HandoffConcern {
  id: string;
  title: string;
  reason: string;
  actorName: string;
  createdAt: string;
}

/** Keep the current validation concerns visible when another staff member takes over. */
export function getHandoffConcerns(
  status: string | null,
  logs: readonly LogEntry[],
  attachments: readonly { requirementName: string; verificationStatus: string }[],
): HandoffConcern[] {
  if (status !== "under_validation" && status !== "incomplete") return [];
  const forward = logs.filter((log) =>
    ["processing", "ready_for_release", "released", "rejected"].includes(log.actionStatus));
  const since = Math.max(-Infinity, ...forward.map((log) => Date.parse(log.createdAt)));
  const concerns: HandoffConcern[] = [];
  const current = logs.filter((log) => Date.parse(log.createdAt) >= since);

  for (const attachment of attachments.filter((doc) => doc.verificationStatus !== "approved")) {
    const match = [...current].reverse().find((log) => {
      const doc = parseDocumentLog(log.actionStatus, log.remarks);
      return doc?.name === attachment.requirementName &&
        (doc.kind === "reopened" || doc.kind === "rejected");
    });
    if (!match) continue;
    const doc = parseDocumentLog(match.actionStatus, match.remarks);
    concerns.push({
      id: match.id, title: attachment.requirementName,
      reason: doc?.reason || "This document needs another review.",
      actorName: match.actorName || "Staff member", createdAt: match.createdAt,
    });
  }

  let previousStatus: string | null = null;
  let returned: LogEntry | undefined;
  for (const log of logs) {
    if (!isRequestStatus(log.actionStatus)) continue;
    if (log.actionStatus === "under_validation" &&
      (["processing", "ready_for_release"].includes(previousStatus ?? "") ||
        log.remarks?.startsWith("Returned to validation"))) returned = log;
    previousStatus = log.actionStatus;
  }
  if (returned && Date.parse(returned.createdAt) >= since) {
    const generic = !returned.remarks?.trim() || /^Advanced from/.test(returned.remarks) || returned.remarks === "Returned to validation \u2014 staff are re-checking a document.";
    if (!generic || concerns.length === 0) concerns.unshift({
      id: returned.id, title: "Returned to validation",
      reason: generic ? "Check History and clarify what needs rechecking before continuing." : returned.remarks!.trim(),
      actorName: returned.actorName || "Staff member", createdAt: returned.createdAt,
    });
  }
  if (status === "incomplete" && concerns.length === 0) {
    const incomplete = [...current].reverse().find((log) => log.actionStatus === "incomplete" && log.remarks?.trim());
    if (incomplete) concerns.push({
      id: incomplete.id, title: "Requirements need correction", reason: incomplete.remarks!,
      actorName: incomplete.actorName || "Staff member", createdAt: incomplete.createdAt,
    });
  }
  return [...new Map(concerns.map((concern) => [concern.id, concern])).values()];
}
