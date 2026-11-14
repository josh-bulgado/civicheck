import { enterDelay } from "~/components/motion/stagger";
import { cn } from "~/lib/utils";
import { formatLogDateTime, type LogEntry } from "~/features/requests/request-history";
import { getCurrentDotClass, getStatusDetails } from "~/features/requests/request-workflow";

type HistoryMotion =
  | "submit"
  | "review"
  | "process"
  | "ready"
  | "complete"
  | "attention"
  | "reject"
  | "cancel"
  | "upload"
  | "arrive";

const MOTIONS: Record<string, HistoryMotion> = {
  submitted: "submit",
  under_validation: "review",
  processing: "process",
  ready_for_release: "ready",
  released: "complete",
  incomplete: "attention",
  rejected: "reject",
  cancelled: "cancel",
  document_rejected: "reject",
  document_resubmitted: "upload",
  document_uploaded: "upload",
  payment_verified: "complete",
  pending_approval: "ready",
};

function HistoryMarker({ status, current, index }: {
  status: string;
  current: boolean;
  index: number;
}) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
      <span
        data-current={current}
        data-motion={MOTIONS[status] ?? "arrive"}
        style={enterDelay(100 + Math.min(index, 5) * 60)}
        className={cn(
          "status-history-dot relative rounded-full",
          current
            ? cn("size-4 ring-4 ring-primary/15", getCurrentDotClass(status))
            : "size-3 bg-[#cfd8e8] dark:bg-border-strong",
        )}
      />
    </span>
  );
}

/**
 * The applicant's status history: newest first, a dot, the status and when. The
 * request page's blue card already says what to do now, so entries carry no
 * note. Document approvals and reversals are staff-side plumbing that neither
 * moves the request nor asks anything of the applicant, so they stay out (a
 * rejection stays: that is their cue to resubmit).
 */
export function RequestStatusHistory({ logs }: { logs: LogEntry[] }) {
  // Logs come back oldest-first.
  const entries = logs
    .filter(
      (log) =>
        log.actionStatus !== "document_approved" &&
        log.actionStatus !== "document_reverted" &&
        log.actionStatus !== "identity_verified" &&
        log.actionStatus !== "handover_confirmed",
    )
    .reverse();

  return (
    <section
      aria-labelledby="status-history-heading"
      className="min-w-0 rounded-3xl border border-border-light bg-card p-5 sm:p-6"
    >
      <h2
        id="status-history-heading"
        className="text-[22px] leading-[normal] font-semibold text-foreground max-md:text-lg"
      >
        Status history
      </h2>
      <ol className="civic-stagger-auto mt-4 flex flex-col">
        {entries.map((log, index) => {
          // The newest entry is where the request is now: the one dot that
          // takes a colour, in an otherwise quiet column.
          const current = index === 0;

          return (
            <li
              key={log.id}
              className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-border-lighter py-3.5 last:border-b-0 last:pb-0 @lg:grid-cols-[1rem_minmax(0,1fr)_auto]"
            >
              <HistoryMarker status={log.actionStatus} current={current} index={index} />
              <span
                className={cn(
                  "min-w-0 text-sm leading-snug text-foreground",
                  current && "font-semibold",
                )}
              >
                {getStatusDetails(log.actionStatus).label}
              </span>
              <time
                dateTime={log.createdAt}
                className="col-start-2 text-xs text-muted-foreground @lg:col-start-auto @lg:text-right"
              >
                {formatLogDateTime(log.createdAt)}
              </time>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
