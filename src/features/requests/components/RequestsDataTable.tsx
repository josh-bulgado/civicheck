import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { SlidersHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { DataTablePagination } from "~/components/ui/data-table-pagination";
import type { Department } from "~/features/admin/departments.queries";
import type { WorkflowStage } from "../request-workflow";
import type { StaffRequestRow } from "../requests.queries";
import { columns } from "./RequestsColumn";
import { ALL_DEPARTMENTS, RequestsTableToolbar } from "./RequestsTableToolbar";

interface RequestsDataTableProps {
  /** Already narrowed by the URL-driven stage / status / payment filters. */
  data: StaffRequestRow[];
  departments: Department[];
  stage: WorkflowStage | undefined;
  onStageChange: (stage: WorkflowStage | undefined) => void;
  stageCounts: Record<"all" | WorkflowStage, number>;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export function RequestsDataTable({
  data,
  departments,
  stage,
  onStageChange,
  stageCounts,
  departmentFilter,
  onDepartmentFilterChange,
  onClearFilters,
}: RequestsDataTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

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
        row.original.trackingNumber.toLowerCase().includes(search) ||
        row.original.applicantName.toLowerCase().includes(search) ||
        row.original.serviceName.toLowerCase().includes(search)
      );
    },
  });

  // The department filter is owned by the URL, so mirror it onto the column
  // rather than keeping a second copy of the state here.
  const departmentColumn = table.getColumn("departmentName");
  useEffect(() => {
    departmentColumn?.setFilterValue(
      departmentFilter === ALL_DEPARTMENTS ? undefined : departmentFilter,
    );
  }, [departmentColumn, departmentFilter]);

  const handleClearFilters = () => {
    setGlobalFilter("");
    onClearFilters();
  };

  return (
    <div className="space-y-4">
      <RequestsTableToolbar
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        stage={stage}
        onStageChange={onStageChange}
        stageCounts={stageCounts}
        departments={departments}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={onDepartmentFilterChange}
      />

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
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() =>
                      navigate({
                        to: "/requests/$requestId",
                        params: { requestId: row.original.id },
                      })
                    }
                    className="cursor-pointer transition-colors hover:bg-surface-subtle active:bg-secondary"
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
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <SlidersHorizontal className="size-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium">
                        No requests found matching your filters.
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-xs h-auto p-0"
                      >
                        Clear filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-t border-border p-4">
          <DataTablePagination table={table} />
        </div>
      </div>
    </div>
  );
}
