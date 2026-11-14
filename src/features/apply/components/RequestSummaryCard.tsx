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
    <div className="overflow-hidden rounded-4xl bg-card shadow-portal-card">
      <div className="border-b border-border-light px-5.5 py-4 text-[17px] font-bold text-foreground">
        Details so far
      </div>
      <div className="flex flex-col gap-3 px-5.5 py-4.5">
        {rows.map((row, index) => (
          <SummaryRow key={`${row.label}-${index}`} {...row} />
        ))}
      </div>
    </div>
  );
}

/** Labels and answers wrap within separate columns, keeping answers on the right. */
function SummaryRow({ label, value }: SummaryRow) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-3 text-[15px]">
      <span className="min-w-0 wrap-anywhere text-muted-foreground">{label}</span>
      <span className="min-w-0 wrap-anywhere text-right font-bold text-foreground">{value}</span>
    </div>
  );
}
