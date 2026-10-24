import { Kbd } from "~/components/ui/kbd";
import { formatPeso } from "~/lib/peso";
import type { PaymentHistoryRow } from "~/features/requests/requests.queries";
import { formatOfficeTime } from "~/lib/date";
import { summarizeTape, tapeRows } from "../tape";

interface TodayTapeProps {
  /** Today's verified payments, newest first. */
  payments: PaymentHistoryRow[];
  /** Requests ready for release that nobody has paid for yet, across the office. */
  awaitingCount: number;
  /** The highlighted row while browsing with the arrow keys, or -1. */
  selectedIndex: number;
  onOpen: (trackingNumber: string) => void;
  /** Hint labels, formatted for the platform. */
  hints: { browse: string; reopen: string; history: string };
}

/**
 * The day's ledger beside the slip: what has been verified and collected, how
 * many are still waiting to pay, and the last few payments. A payment can be
 * reopened from here when an applicant comes back to ask about their receipt.
 */
export function TodayTape({ payments, awaitingCount, selectedIndex, onOpen, hints }: TodayTapeProps) {
  const { count, total } = summarizeTape(payments);
  const rows = tapeRows(payments);

  return (
    <aside
      aria-label="Today's payments"
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border-strong bg-card"
    >
      <dl className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="flex flex-col gap-1 p-4">
          <dt className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Verified
          </dt>
          <dd className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{count}</dd>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <dt className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Collected
          </dt>
          <dd className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
            {formatPeso(total)}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">Awaiting payment at the office</span>
        <span
          className={
            awaitingCount > 0
              ? "font-semibold text-tone-warning tabular-nums"
              : "font-semibold text-muted-foreground tabular-nums"
          }
        >
          {awaitingCount}
        </span>
      </div>

      <h2 className="px-4 pt-3.5 pb-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Today&rsquo;s Tape
      </h2>

      {rows.length === 0 ? (
        <p className="px-4 pt-1 pb-5 text-sm text-pretty text-muted-foreground">
          No payments yet today. Each one you verify is listed here.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5 px-2 pb-2">
          {rows.map((payment, index) => (
            <li key={payment.id}>
              <button
                type="button"
                onClick={() => onOpen(payment.trackingNumber)}
                aria-current={index === selectedIndex ? "true" : undefined}
                className="grid w-full grid-cols-[4.25rem_minmax(0,1fr)_auto] items-baseline gap-x-2.5 rounded-lg px-2.5 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=true]:bg-primary-soft"
              >
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatOfficeTime(payment.verifiedAt)}
                </span>
                <span className="truncate text-sm font-medium">{payment.applicantName}</span>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {payment.feesDue > 0 ? formatPeso(payment.feesDue) : "No Fee"}
                </span>
                <span />
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {payment.trackingNumber}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {payment.orNumber ? `OR ${payment.orNumber}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Kbd aria-hidden="true">{hints.browse}</Kbd>
          Browse
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd aria-hidden="true">{hints.reopen}</Kbd>
          Reopen
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd aria-hidden="true">{hints.history}</Kbd>
          Full History
        </span>
      </div>
    </aside>
  );
}
