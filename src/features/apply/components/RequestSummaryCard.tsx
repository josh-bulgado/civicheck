import { useLayoutEffect, useRef, useState } from "react";
import type { SummaryRow } from "~/features/apply/summary-rows";
import { cn } from "~/lib/utils";

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

/**
 * A row reads two ways. When the label and the answer fit together the answer
 * sits on the right of the same line. When they don't, the browser drops the
 * answer under the label, and the row is then a label over its answer, both
 * flush left, so a long answer reads as one block instead of a ragged right
 * edge hanging beneath a short label.
 *
 * The browser decides which by itself (the row wraps); `stacked` only follows
 * that decision to pick the alignment. Alignment doesn't change what fits, so
 * the row can't flip back and forth between the two.
 */
function SummaryRow({ label, value }: SummaryRow) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      const [labelEl, valueEl] = Array.from(row.children) as HTMLElement[];
      setStacked(valueEl.offsetTop >= labelEl.offsetTop + labelEl.offsetHeight);
    };

    measure();
    // The card narrows with the window, and a web font arriving late changes
    // how wide the text is, so the row is re-read whenever its own width moves.
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [label, value]);

  return (
    <div
      ref={rowRef}
      data-stacked={stacked}
      className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[15px]"
    >
      <span className="min-w-0 wrap-break-word text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 line-clamp-3 wrap-break-word font-bold text-foreground",
          stacked ? "text-left" : "ml-auto text-right",
        )}
      >
        {value}
      </span>
    </div>
  );
}
