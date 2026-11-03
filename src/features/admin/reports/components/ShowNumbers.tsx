import { Disclosure } from "~/features/admin/reports/components/Disclosure";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

interface ShowNumbersProps {
  /** Names the table for screen readers, e.g. "Requests per month". */
  label: string;
  /** Text of the button that opens the table. */
  trigger?: string;
  columns: ReadonlyArray<{ header: string; numeric?: boolean }>;
  rows: ReadonlyArray<ReadonlyArray<string | number>>;
  /** A closing row, usually the total. */
  footer?: ReadonlyArray<string | number>;
}

/**
 * Every chart in the briefing is backed by its table. The picture comes first
 * for someone who wants the answer; the exact figures are one press away for
 * someone who wants to check or copy them.
 */
export function ShowNumbers({
  label,
  trigger = "Show the Numbers",
  columns,
  rows,
  footer,
}: ShowNumbersProps) {
  return (
    <Disclosure label={trigger} className="overflow-x-auto">
      <Table aria-label={label}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.header}
                className={cn("text-sm", column.numeric && "text-right")}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={String(row[0])}>
              {row.map((cell, index) => (
                <TableCell
                  key={columns[index]?.header ?? index}
                  className={cn(
                    "whitespace-normal text-base",
                    columns[index]?.numeric && "text-right tabular-nums",
                  )}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {footer ? (
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              {footer.map((cell, index) => (
                <TableCell
                  key={columns[index]?.header ?? index}
                  className={cn(
                    "text-base font-bold",
                    columns[index]?.numeric && "text-right tabular-nums",
                  )}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </Disclosure>
  );
}
