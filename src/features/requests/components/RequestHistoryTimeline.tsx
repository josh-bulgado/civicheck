import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "~/components/reui/timeline";
import {
  getCurrentDotClass,
  getLogNote,
  getStatusDetails,
} from "~/features/requests/request-workflow";

interface HistoryLog {
  id: string;
  actionStatus: string;
  remarks: string | null;
  createdAt: string;
  /** Staff view only — the applicant's logs don't carry who acted. */
  actorName?: string;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The status-history timeline shared by the applicant and staff request
 * pages. Staff see every entry with who made it; applicants don't see
 * document approvals/reversals — that's staff-side plumbing that neither
 * moves the request forward nor asks them to do anything (a rejection stays,
 * since that's their cue to resubmit).
 */
export function RequestHistoryTimeline({
  logs,
  audience,
  feesDue,
}: {
  logs: HistoryLog[];
  audience: "applicant" | "staff";
  feesDue: number;
}) {
  const visibleLogs =
    audience === "applicant"
      ? logs.filter(
          (log) =>
            log.actionStatus !== "document_approved" &&
            log.actionStatus !== "document_reverted",
        )
      : logs;
  // Logs come back oldest-first; show the newest on top so the current status
  // is the first thing read instead of sitting at the bottom of the page.
  const entries = [...visibleLogs].reverse();

  return (
    <section className="dashboard-panel p-6">
      <h2 className="mb-4 text-lg font-bold text-foreground">Status history</h2>
      <Timeline className="civic-stagger-auto">
        {entries.map((log, index) => {
          const logStatus = getStatusDetails(log.actionStatus);
          // The newest entry is the request's current status — the one thing
          // worth the eye landing on first in an otherwise-quiet gray timeline.
          const isCurrent = index === 0;
          // Older entries were saved with a generic "Advanced from…" remark;
          // show the descriptive note for those instead.
          const note = getLogNote(
            log.actionStatus,
            log.remarks,
            audience,
            feesDue,
          );
          return (
            <TimelineItem key={log.id} step={index + 1}>
              <TimelineHeader>
                <TimelineSeparator />
                <TimelineIndicator
                  className={`border-0 ${
                    isCurrent
                      ? `${getCurrentDotClass(logStatus.variant)} size-4 ring-4 ring-primary/15`
                      : "bg-health-neutral-dot size-3"
                  }`}
                />
                <TimelineTitle
                  className={isCurrent ? "font-semibold" : undefined}
                >
                  {logStatus.label}
                </TimelineTitle>
                <TimelineDate dateTime={log.createdAt}>
                  {formatDateTime(log.createdAt)}
                  {log.actorName ? ` · ${log.actorName}` : ""}
                </TimelineDate>
              </TimelineHeader>
              {note && <TimelineContent>{note}</TimelineContent>}
            </TimelineItem>
          );
        })}
      </Timeline>
    </section>
  );
}
