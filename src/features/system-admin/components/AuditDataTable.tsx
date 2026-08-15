import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";
import { DataTablePagination } from "~/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { AuditFilters, NormalizedAuditEvent } from "../system-admin.types";
import { auditColumns } from "./AuditColumn";
import {
  AuditTableToolbar,
  type AuditFilterValues,
} from "./AuditTableToolbar";

function toFilterValues(filters: AuditFilters): AuditFilterValues {
  return {
    actor: filters.actor ?? "",
    event: filters.event ?? "",
    source: filters.source ?? "all",
    from: filters.from ?? "",
    to: filters.to ?? "",
  };
}

export function AuditDataTable({
  data,
  total,
  filters,
}: {
  data: NormalizedAuditEvent[];
  total: number;
  filters: AuditFilters;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filterValues, setFilterValues] = useState<AuditFilterValues>(() =>
    toFilterValues(filters),
  );
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const pageCount = Math.ceil(total / pageSize);
  const pagination: PaginationState = { pageIndex: page - 1, pageSize };

  const table = useReactTable({
    data,
    columns: auditColumns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount,
  });

  function navigate(nextPage: number, values = filterValues) {
    return router.navigate({
      to: "/system-admin/audit",
      search: {
        page: nextPage,
        actor: values.actor || undefined,
        event: values.event || undefined,
        source: values.source,
        from: values.from || undefined,
        to: values.to || undefined,
      },
    });
  }

  function clearFilters() {
    const cleared = toFilterValues({});
    setFilterValues(cleared);
    void navigate(1, cleared);
  }

  return (
    <div className="space-y-4">
      <AuditTableToolbar
        values={filterValues}
        onChange={setFilterValues}
        onApply={() => void navigate(1)}
        onClear={clearFilters}
      />

      <div className="overflow-hidden rounded-xl border border-border-strong bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface-subtle">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => (
                    <TableHead key={header.id} className="h-12 px-5">
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
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="h-[76px] hover:bg-surface-subtle"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-5 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={auditColumns.length}
                    className="h-40 text-center text-muted-foreground"
                  >
                    <SlidersHorizontal className="mx-auto mb-3 size-7 opacity-40" />
                    <p className="text-sm font-medium">
                      No audit events match these filters.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t px-5 py-4 text-sm text-muted-foreground">
          {total} matching event{total === 1 ? "" : "s"}
        </div>
      </div>

      {pageCount > 1 ? (
        <DataTablePagination
          table={table}
          pageCount={pageCount}
          pageSizeOptions={[pageSize]}
          onPageChange={(pageIndex) => void navigate(pageIndex + 1)}
        />
      ) : null}
    </div>
  );
}
