import { useState } from "react";
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
import { columns, type ServiceDossier } from "./ServicesColumn";
import { ServicesTableToolbar, type ClassificationFilter } from "./ServicesTableToolbar";
import { Button } from "~/components/ui/button";
import { DataTablePagination } from "~/components/ui/data-table-pagination";

interface ServicesDataTableProps {
  data: ServiceDossier[];
  onView?: (service: ServiceDossier) => void;
}

export function ServicesDataTable({
  data,
  onView,
}: ServicesDataTableProps) {
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
        (row.original.display_name ?? row.original.name)
          .toLowerCase()
          .includes(search) ||
        row.original.dossier_key.toLowerCase().includes(search) ||
        row.original.variant_codes.some((code) =>
          code.toLowerCase().includes(search),
        )
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
    <div className="flex flex-col gap-4">

      <ServicesTableToolbar
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        classificationFilter={classificationFilter}
        onClassificationFilterChange={handleClassificationFilter}
      />

      {/* Table */}
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
                  <TableRow
                    key={row.id}
                    className="transition-colors hover:bg-surface-subtle"
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
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SlidersHorizontal aria-hidden="true" className="size-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium">No services found matching your filters.</p>
                      <Button variant="link" size="sm" onClick={handleClearFilters} className="text-xs h-auto p-0">
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <DataTablePagination table={table} />
        </div>
      </div>
    </div>
  );
}
