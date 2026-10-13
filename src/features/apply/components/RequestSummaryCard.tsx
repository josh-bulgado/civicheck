import type { SummaryRow } from "~/features/apply/summary-rows";

interface RequestSummaryCardProps {
  rows: readonly SummaryRow[];
}

/**
 * The applicant's answers so far. It renders nothing until there is at least
 * one answer, so an empty application doesn't show an empty box.
 */
export function RequestSummaryCard({ rows }: RequestSummaryCardProps) {
  if (rows.length === 0) return null;

  return (
    <div className="civic-card overflow-hidden rounded-2xl">
      <div className="border-b border-border-light px-4.5 py-3.5 text-base font-bold text-foreground">
        Details so far
      </div>
      <div className="flex flex-col gap-2.5 px-4.5 py-4">
        {rows.map((row, index) => (
          <SummaryRow key={`${row.label}-${index}`} {...row} />
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: SummaryRow) {
  return (
    // Wraps so a long label (e.g. a yes/no question) takes its own line and the
    // answer drops beneath it, instead of the label squeezing the answer out.
    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[15px]">
      <span className="min-w-0 wrap-break-word text-muted-foreground">
        {label}
      </span>
      <span className="ml-auto min-w-0 line-clamp-3 wrap-break-word text-right font-bold text-foreground">
        {value}
      </span>
    </div>
  );
}
