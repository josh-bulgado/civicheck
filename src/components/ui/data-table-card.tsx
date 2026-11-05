import type { ComponentProps, ReactNode } from "react";
import { flexRender, type RowData } from "@tanstack/react-table";
import { Columns3, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DataTablePagination } from "~/components/ui/data-table-pagination";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import type { AppRow, AppTable } from "~/lib/table";

const ARIA_SORT: Record<string, "ascending" | "descending" | undefined> = {
  asc: "ascending",
  desc: "descending",
};

type RowProps = ComponentProps<"tr"> & {
  [attribute: `data-${string}`]: string | undefined;
};

interface DataTableCardProps<TData extends RowData> {
  table: AppTable<TData>;
  /** Search, chips and selects. Sits above the table behind a hairline. */
  toolbar: ReactNode | ((columnMenu: ReactNode) => ReactNode);
  /** Labels columns that users may show or hide. Omit to hide the chooser. */
  columnLabels?: Readonly<Record<string, string>>;
  /** Names the table for screen readers, e.g. "Requests". */
  label: string;
  /** Shown, with a Clear Filters button, when no row survives the filters. */
  emptyLabel: string;
  onClearFilters?: () => void;
  emptyIcon?: LucideIcon;
  /** Replaces the client-side pagination footer, for tables paged by the server. */
  footer?: ReactNode;
  /** Per-row attributes: click handlers, data attributes, extra classes. */
  getRowProps?: (row: AppRow<TData>) => RowProps;
  cellClassName?: string;
  className?: string;
  /** Visual treatment shared by the table header and rows. */
  variant?: ComponentProps<typeof Table>["variant"];
}

interface ColumnVisibilityMenuProps<TData extends RowData> {
  table: AppTable<TData>;
  labels: Readonly<Record<string, string>>;
}

function ColumnVisibilityMenu<TData extends RowData>({
  table,
  labels,
}: ColumnVisibilityMenuProps<TData>) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide() && labels[column.id]);

  if (columns.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="lg" />}>
        <Columns3 aria-hidden="true" data-icon="inline-start" />
        Columns
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show columns</DropdownMenuLabel>
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(checked) => column.toggleVisibility(checked)}
            >
              {labels[column.id]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * One card holding the filters, the table and the pagination footer: the
 * shape of the Services, Staff and Request Queue pages. The page owns the
 * `table` instance, so sorting, filtering and columns stay where they differ.
 */
export function DataTableCard<TData extends RowData>({
  table,
  toolbar,
  columnLabels,
  label,
  emptyLabel,
  onClearFilters,
  emptyIcon: EmptyIcon = SlidersHorizontal,
  footer,
  getRowProps,
  cellClassName,
  className,
  variant = "entity",
}: DataTableCardProps<TData>) {
  const rows = table.getRowModel().rows;
  const columnMenu = columnLabels ? (
    <ColumnVisibilityMenu table={table} labels={columnLabels} />
  ) : null;
  const toolbarContent =
    typeof toolbar === "function" ? (
      toolbar(columnMenu)
    ) : columnMenu ? (
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">{toolbar}</div>
        {columnMenu}
      </div>
    ) : (
      toolbar
    );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border-strong bg-card",
        className,
      )}
    >
      <div className="border-b border-border px-5 py-4">{toolbarContent}</div>

      <div className="overflow-x-auto">
        <Table variant={variant} aria-label={label}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent [&>:first-child]:pl-5 [&>:last-child]:pr-5"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    aria-sort={ARIA_SORT[String(header.column.getIsSorted())]}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="civic-stagger-auto ">
            {rows.length > 0 ? (
              rows.map((row) => {
                const { className: rowClassName, ...rowProps } =
                  getRowProps?.(row) ?? {};
                return (
                  <TableRow
                    key={row.id}
                    {...rowProps}
                    className={cn(
                      "[&>:first-child]:pl-5 [&>:last-child]:pr-5",
                      rowClassName,
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cellClassName}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <EmptyIcon
                      aria-hidden="true"
                      className="size-8 text-muted-foreground/50"
                    />
                    <p className="text-sm font-medium">{emptyLabel}</p>
                    {onClearFilters ? (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={onClearFilters}
                        className="h-auto p-0 text-xs"
                      >
                        Clear Filters
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-border px-5 py-4">
        {footer ?? <DataTablePagination table={table} />}
      </div>
    </div>
  );
}
