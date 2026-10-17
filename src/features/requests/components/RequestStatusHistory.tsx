import { cn } from "~/lib/utils";
import { getCurrentDotClass, getStatusDetails } from "~/features/requests/request-workflow";

interface HistoryLog {
  id: string;
  actionStatus: string;
  createdAt: string;
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
 * The applicant's status history: newest first, a dot, the status and when. The
 * request page's blue card already says what to do now, so entries carry no
 * note. Document approvals and reversals are staff-side plumbing that neither
 * moves the request nor asks anything of the applicant, so they stay out (a
 * rejection stays: that is their cue to resubmit).
 */
export function RequestStatusHistory({ logs }: { logs: HistoryLog[] }) {
  // Logs come back oldest-first.
  const entries = logs
    .filter(
      (log) =>
        log.actionStatus !== "document_approved" &&
        log.actionStatus !== "document_reverted",
    )
    .reverse();

  return (
    <section
      aria-labelledby="status-history-heading"
      className="rounded-[28px] bg-card px-6 py-6 shadow-portal-card ring-2 ring-border-light md:px-9 md:py-8"
    >
      <h2
        id="status-history-heading"
        className="text-[22px] leading-[normal] font-semibold text-foreground"
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
              className="flex items-center gap-4 border-b border-border-lighter py-3.5 last:border-b-0 last:pb-0"
            >
              <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                <span
                  className={cn(
                    "rounded-full",
                    current
                      ? cn(
                          "size-4 ring-4 ring-primary/15",
                          getCurrentDotClass(log.actionStatus),
                        )
                      : "size-3 bg-border-strong",
                  )}
                />
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-lg leading-snug text-foreground",
                  current && "font-semibold",
                )}
              >
                {getStatusDetails(log.actionStatus).label}
              </span>
              <time
                dateTime={log.createdAt}
                className="shrink-0 text-[15px] text-muted-foreground"
              >
                {formatDateTime(log.createdAt)}
              </time>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
