import { useState } from "react";
import {
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Receipt, Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { DataTablePagination } from "~/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { PaymentHistoryRow } from "../requests.queries";
import { paymentHistoryColumns } from "./PaymentHistoryColumn";

export function PaymentHistoryDataTable({ data }: { data: PaymentHistoryRow[] }) {
  // Newest first — the cashier is usually checking what just went through.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "verifiedAt", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns: paymentHistoryColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase();
      const { trackingNumber, applicantName, serviceName, orNumber, verifiedBy } =
        row.original;
      return [trackingNumber, applicantName, serviceName, orNumber ?? "", verifiedBy].some(
        (field) => field.toLowerCase().includes(search),
      );
    },
  });

  const hasPayments = data.length > 0;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by tracking number, applicant, service, or OR number..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-10 rounded-lg border-border pl-10 text-sm focus-visible:border-primary focus-visible:ring-primary"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border-strong bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-border bg-surface-subtle">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="civic-stagger-auto">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="transition-colors hover:bg-surface-subtle">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={paymentHistoryColumns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Receipt className="size-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium">
                        {hasPayments
                          ? "No payments match your search."
                          : "No payments were verified in this date range."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {hasPayments && (
          <div className="border-t border-border p-4">
            <DataTablePagination table={table} />
          </div>
        )}
      </div>
    </div>
  );
}
