import { useState, type ReactNode } from "react";
import { ArrowRight, Banknote, Check, FileUp, RotateCcw, X, type LucideIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  buildHistory,
  formatLogDateTime,
  formatLogTime,
  type HistoryEvent,
  type HistoryItem,
  type HistoryKind,
  type HistoryTone,
  type LogEntry,
} from "~/features/requests/request-history";
import { getStatusDetails } from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";

const ICON: Record<HistoryKind, LucideIcon> = {
  status: ArrowRight,
  approved: Check,
  rejected: X,
  reopened: RotateCcw,
  resubmitted: FileUp,
  payment: Banknote,
};

const VERB: Partial<Record<HistoryKind, string>> = {
  approved: "accepted",
  rejected: "rejected",
  reopened: "reopened",
  resubmitted: "resubmitted",
};

const ICON_TONE: Record<HistoryTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-tone-review-soft text-tone-review",
  success: "bg-tone-success-soft text-tone-success",
  warning: "bg-tone-warning-soft text-tone-warning",
  danger: "bg-tone-danger-soft text-tone-danger",
};

// A bar on the row's left edge, only for the events worth finding again.
const ACCENT: Record<HistoryTone, string> = {
  neutral: "border-l-transparent",
  info: "border-l-health-info-dot",
  success: "border-l-health-success-dot",
  warning: "border-l-health-warning-dot",
  danger: "border-l-health-error-dot",
};

const ROW =
  "grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 border-l-[3px] px-4 py-2.5 text-sm sm:grid-cols-[5.5rem_1.75rem_minmax(0,1fr)]";

function Time({ value, className }: { value: string; className?: string }) {
  return (
    <time
      dateTime={value}
      title={formatLogDateTime(value)}
      className={cn("tabular-nums text-muted-foreground", className)}
    >
      {formatLogTime(value)}
    </time>
  );
}

function Marker({ kind, tone }: { kind: HistoryKind; tone: HistoryTone }) {
  const Icon = ICON[kind];
  return (
    <span
      className={cn("flex size-6 items-center justify-center rounded-full", ICON_TONE[tone])}
      aria-hidden="true"
    >
      <Icon className="size-3.5" />
    </span>
  );
}

function Actor({ name, strong }: { name: string; strong: boolean }) {
  return (
    <span className={cn("font-medium", strong ? "text-foreground" : "text-muted-foreground")}>
      {name}
    </span>
  );
}

function DocumentName({ document }: { document: NonNullable<HistoryEvent["document"]> }) {
  return <span title={document.full}>{document.name}</span>;
}

function sentence(event: HistoryEvent): ReactNode {
  const actor = <Actor name={event.actor} strong={event.important} />;

  if (event.kind === "status") {
    const status = getStatusDetails(event.status);
    return (
      <>
        {actor} moved to <Badge variant={status.variant}>{status.label}</Badge>
      </>
    );
  }
  if (event.kind === "payment") {
    return (
      <>
        {actor} {event.label}
      </>
    );
  }
  return (
    <>
      {actor} {VERB[event.kind]} {event.document && <DocumentName document={event.document} />}
    </>
  );
}

function EventRow({ event }: { event: HistoryEvent }) {
  return (
    <li
      className={cn(
        ROW,
        event.important ? ACCENT[event.tone] : "border-l-transparent",
        event.important ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Time value={event.createdAt} className="order-last col-start-2 sm:order-none sm:col-start-auto" />
      <Marker kind={event.kind} tone={event.tone} />
      <div className="min-w-0">
        <p className="leading-6 break-words">{sentence(event)}</p>
        {event.note && <p className="mt-0.5 break-words text-muted-foreground">{event.note}</p>}
      </div>
    </li>
  );
}

function RunRow({ events, actor }: { events: HistoryEvent[]; actor: string }) {
  const [open, setOpen] = useState(false);
  const newest = events[0];
  const oldest = events[events.length - 1];
  const range =
    oldest.createdAt === newest.createdAt
      ? formatLogTime(newest.createdAt)
      : `${formatLogTime(oldest.createdAt)}–${formatLogTime(newest.createdAt)}`;

  return (
    <li className={cn(ROW, "border-l-transparent text-muted-foreground")}>
      <Time value={newest.createdAt} className="order-last col-start-2 sm:order-none sm:col-start-auto" />
      <Marker kind="approved" tone="success" />
      <div className="min-w-0">
        <p className="leading-6">
          <Actor name={actor} strong={false} /> accepted {events.length} documents
          <span className="text-muted-foreground"> · {range}</span>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="ml-2 font-medium text-primary hover:underline"
          >
            {open ? "Hide" : "Show"}
          </button>
        </p>
        {open && (
          <ul className="mt-1.5 flex flex-col gap-1 border-l-2 border-border-light pl-3">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3">
                <Time value={event.createdAt} className="min-w-16" />
                {event.document && <DocumentName document={event.document} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function Item({ item }: { item: HistoryItem }) {
  return item.kind === "run" ? (
    <RunRow events={item.events} actor={item.actor} />
  ) : (
    <EventRow event={item.event} />
  );
}

/**
 * The staff History tab: a log, not a chat. One line per event with who did
 * what, newest first, grouped by day. Routine acceptances recede and fold into
 * a run; rejections, send-backs, resubmissions, payment and release carry an
 * accent bar and their reason on the next line. Hover a time for the full date,
 * a document for its full requirement.
 */
export function RequestHistoryLog({ logs, feesDue }: { logs: LogEntry[]; feesDue: number }) {
  const days = buildHistory(logs, feesDue);

  return (
    <section className="dashboard-panel overflow-hidden p-0">
      <p className="border-b border-border-light px-4 py-3 text-sm text-muted-foreground">
        {logs.length} {logs.length === 1 ? "event" : "events"}, newest first. Hover a time for the
        full date.
      </p>
      {days.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Nothing has happened yet.</p>
      ) : (
        days.map((day) => (
          <div key={day.key}>
            <h3 className="flex items-baseline gap-2 border-y border-border-light bg-muted/50 px-4 py-2 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase first:border-t-0">
              {day.label}
              <span className="font-normal tracking-normal normal-case">
                {day.count} {day.count === 1 ? "event" : "events"}
              </span>
            </h3>
            <ul className="divide-y divide-border-light">
              {day.items.map((item) => (
                <Item key={item.kind === "run" ? item.id : item.event.id} item={item} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
