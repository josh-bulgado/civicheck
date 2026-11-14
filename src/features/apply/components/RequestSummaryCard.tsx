import type { SummaryRow } from "~/features/apply/summary-rows";

interface RequestSummaryCardProps {
  rows: readonly SummaryRow[];
}

/**
 * The applicant's answers so far. It renders nothing until there is at least
 * one answer, so an empty application doesn't show an empty box. It never
 * carries the fee: the docket above the card is the one place that does.
 */
export function RequestSummaryCard({ rows }: RequestSummaryCardProps) {
  if (rows.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-4xl bg-card shadow-portal-card lg:max-h-[calc(100dvh-10rem)]">
      <div className="shrink-0 border-b border-border-light px-5.5 py-4 text-[17px] font-bold text-foreground">
        Details so far
      </div>
      <div
        role="region"
        aria-label="Details so far"
        tabIndex={0}
        className="flex min-h-0 flex-col gap-3 px-5.5 py-4.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:overflow-y-auto"
      >
        {rows.map((row, index) => (
          <SummaryRow key={`${row.label}-${index}`} {...row} />
        ))}
      </div>
    </div>
  );
}

/** Each answer sits below its label. */
function SummaryRow({ label, value }: SummaryRow) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-[15px]">
      <span className="min-w-0 wrap-anywhere text-muted-foreground">{label}</span>
      <span className="min-w-0 wrap-anywhere font-bold text-foreground">{value}</span>
    </div>
  );
}
