import type { ReactNode } from "react";
import { useGrown } from "~/features/admin/reports/use-grown";

export interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
  /** What is printed at the end of the row. Defaults to the value. */
  valueLabel?: ReactNode;
  /** A line under the bar: a share, a warning about a small sample. */
  note?: ReactNode;
  /** An empty stretch drawn as text, with no bar. */
  gap?: boolean;
}

interface BarListProps {
  rows: ReadonlyArray<BarRow>;
  /** Names the list for screen readers, e.g. "Requests per month". */
  label: string;
  /** The value a full bar stands for. Defaults to the largest row. */
  max?: number;
  /** Shown on a gap row in place of a bar. */
  gapLabel?: string;
}

/**
 * Horizontal bars with the figure written at the end of each. The label sits on
 * the left where it is read first, and the number never depends on measuring
 * the bar. Used for requests per month, days per service, shares of the whole.
 */
export function BarList({ rows, label, max, gapLabel = "No requests" }: BarListProps) {
  const grown = useGrown();
  const scale = max ?? Math.max(1, ...rows.map((row) => row.value));

  return (
    <ol aria-label={label} className="flex flex-col gap-3.5">
      {rows.map((row, index) => (
        <li
          key={row.key}
          className="grid grid-cols-[minmax(7rem,13rem)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 max-sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <span className="min-w-0 text-base font-medium text-foreground max-sm:col-span-full">
            {row.label}
          </span>
          {row.gap ? (
            <span className="col-span-2 text-base text-muted-foreground max-sm:col-span-full">
              {gapLabel}
            </span>
          ) : (
            <>
              <span
                aria-hidden="true"
                className="h-3 overflow-hidden rounded-full bg-muted max-sm:col-start-1"
              >
                <span
                  className="block h-full min-w-0.5 rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
                  style={{
                    width: grown && row.value > 0 ? `${(row.value / scale) * 100}%` : "0%",
                    transitionDelay: `${index * 55}ms`,
                  }}
                />
              </span>
              <span className="text-right text-base font-bold tabular-nums">
                {row.valueLabel ?? row.value}
              </span>
              {row.note ? (
                <span className="col-span-2 col-start-2 -mt-0.5 text-sm text-muted-foreground max-sm:col-span-full max-sm:col-start-1">
                  {row.note}
                </span>
              ) : null}
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
