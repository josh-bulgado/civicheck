import type { RowData } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { AppColumn, AppColumnDef, AppTable } from "~/lib/table";

export function CenterSortHeader<TData extends RowData>({
  column,
  label,
}: {
  column: AppColumn<TData>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <button
      type="button"
      className="center-sort-header"
      onClick={() => column.toggleSorting(sorted === "asc")}
      aria-label={`Sort by ${label.toLowerCase()}`}
    >
      {label}
      <Icon aria-hidden="true" className="size-3" />
    </button>
  );
}

export function centerSelectionColumn<TData extends RowData>(
  label: (row: TData) => string,
): AppColumnDef<TData> {
  return {
    id: "select",
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows on this page"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
        }
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${label(row.original)}`}
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked)}
      />
    ),
  };
}

export function CenterTablePagination<TData extends RowData>({
  table,
  total,
  pageCount: suppliedPageCount,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: {
  table: AppTable<TData>;
  total: number;
  pageCount?: number;
  pageSizeOptions?: number[];
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
}) {
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = Math.max(1, suppliedPageCount ?? table.getPageCount());
  const pages = Array.from(
    new Set([
      0,
      pageCount - 1,
      pageIndex - 1,
      pageIndex,
      pageIndex + 1,
      ...(pageIndex < 2 ? [1, 2] : []),
    ]),
  )
    .filter((page) => page >= 0 && page < pageCount)
    .sort((a, b) => a - b);
  const selected = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="center-table-footer">
      <div className="center-page-size">
        <span>Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => value && onPageSizeChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top" alignItemWithTrigger={false}>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>of {total} rows</span>
        {selected > 0 ? (
          <span role="status" className="center-selection-count">
            {selected} selected
          </span>
        ) : null}
      </div>
      <nav aria-label="Table pagination" className="center-page-buttons">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Go to first page"
          disabled={disabled || pageIndex === 0}
          onClick={() => onPageChange(0)}
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Go to previous page"
          disabled={disabled || pageIndex === 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          <ChevronLeft />
        </Button>
        {pages.map((page, index) => (
          <span key={page} className="center-page-number">
            {index > 0 && page - pages[index - 1] > 1 ? (
              <span className="center-page-ellipsis">…</span>
            ) : null}
            <Button
              variant={page === pageIndex ? "default" : "outline"}
              size="icon-sm"
              aria-label={`Go to page ${page + 1}`}
              aria-current={page === pageIndex ? "page" : undefined}
              disabled={disabled}
              onClick={() => onPageChange(page)}
            >
              {page + 1}
            </Button>
          </span>
        ))}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Go to next page"
          disabled={disabled || pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Go to last page"
          disabled={disabled || pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageCount - 1)}
        >
          <ChevronsRight />
        </Button>
      </nav>
    </div>
  );
}
