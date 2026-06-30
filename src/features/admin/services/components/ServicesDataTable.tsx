import { useState, useMemo } from "react";
import {
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { SlidersHorizontal } from "lucide-react";
import { Service } from "../services.types";
import { columns } from "./ServicesColumn";
import { ServicesStatsCards } from "./ServicesStatsCards";
import { ServicesTableToolbar, type ClassificationFilter } from "./ServicesTableToolbar";
import { Button } from "~/components/ui/button";
import { DataTablePagination } from "~/components/ui/data-table-pagination";

interface ServicesDataTableProps {
  data: Service[];
  onView?: (service: Service) => void;
}

export function ServicesDataTable({ data, onView }: ServicesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<ClassificationFilter>("all");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(search) ||
        row.original.service_code.toLowerCase().includes(search)
      );
    },
    meta: { onView },
  });

  const handleClassificationFilter = (value: ClassificationFilter) => {
    setClassificationFilter(value);
    if (value === "all") {
      table.getColumn("classification")?.setFilterValue(undefined);
    } else {
      table.getColumn("classification")?.setFilterValue(value);
    }
  };

  const handleClearFilters = () => {
    setGlobalFilter("");
    handleClassificationFilter("all");
  };

  return (
    <div className="space-y-6">
      <ServicesStatsCards data={data} />

      <ServicesTableToolbar
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        classificationFilter={classificationFilter}
        onClassificationFilterChange={handleClassificationFilter}
      />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-100">
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
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => onView?.(row.original)}
                    className="cursor-pointer hover:bg-slate-50/80 active:bg-slate-100/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <SlidersHorizontal className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium">No services found matching your filters.</p>
                      <Button variant="link" size="sm" onClick={handleClearFilters} className="text-xs h-auto p-0">
                        Clear filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4">
          <DataTablePagination table={table} />
        </div>
      </div>
    </div>
  );
}
