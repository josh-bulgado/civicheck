import { type Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
  // server-side overrides — provide these for server-side pagination
  pageCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50],
  pageCount: serverPageCount,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;

  // server-side mode uses the provided pageCount, client-side uses table's
  const pageCount = serverPageCount ?? table.getPageCount();
  const isServerSide = !!onPageChange;

  const canPreviousPage = isServerSide ? pageIndex > 0 : table.getCanPreviousPage();
  const canNextPage = isServerSide ? pageIndex < pageCount - 1 : table.getCanNextPage();

  const totalRows = table.getFilteredRowModel().rows.length;
  // for server-side, row count reflects only the current page so summary is different
  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = isServerSide
    ? pageIndex * pageSize + totalRows
    : Math.min((pageIndex + 1) * pageSize, totalRows);
  const totalLabel = isServerSide ? `${lastRow}+` : `${totalRows}`;

  const goToPage = (page: number) => {
    if (isServerSide) {
      onPageChange(page);
    } else {
      table.setPageIndex(page);
    }
  };

  const changePageSize = (size: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(size);
    } else {
      table.setPageSize(size);
      table.setPageIndex(0);
    }
  };

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Showing {firstRow}–{lastRow} of {totalLabel} row(s).
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => changePageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => goToPage(0)}
            disabled={!canPreviousPage}
            aria-label="Go to first page"
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => goToPage(pageIndex - 1)}
            disabled={!canPreviousPage}
            aria-label="Go to previous page"
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => goToPage(pageIndex + 1)}
            disabled={!canNextPage}
            aria-label="Go to next page"
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => goToPage(pageCount - 1)}
            disabled={!canNextPage}
            aria-label="Go to last page"
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
