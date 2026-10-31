import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  flexRender,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { Button } from "~/components/ui/button";
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
import { AuditTableToolbar, type AuditFilterValues } from "./AuditTableToolbar";
import { AuditTableSkeleton } from "./AuditTableSkeleton";
import { AuditTableRows } from "./AuditTableRows";
import { CenterTablePagination } from "./CenterTableControls";
import { appTableFeatures } from "~/lib/table";

export function AuditDataTable({
  data,
  total,
  filters,
  isLoading = false,
  error = null,
  onRetry,
}: {
  data: NormalizedAuditEvent[];
  total: number;
  filters: AuditFilters;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageSize, setPageSize] = useState(10);
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const pageIndex = Math.min(
    Math.max(0, (filters.page ?? 1) - 1),
    pageCount - 1,
  );
  const values = useMemo<AuditFilterValues>(
    () => ({
      q: filters.q ?? "",
      actor: filters.actor ?? "",
      event: filters.event ?? "",
      source: filters.source ?? "all",
      from: filters.from ?? "",
      to: filters.to ?? "",
    }),
    [
      filters.q,
      filters.actor,
      filters.event,
      filters.source,
      filters.from,
      filters.to,
    ],
  );

  const table = useTable({
    features: appTableFeatures,
    data,
    columns: auditColumns,
    getRowId: (event) => `${event.source}:${event.id}`,
    state: { sorting, pagination: { pageIndex, pageSize } },
    autoResetPageIndex: false,
    onSortingChange: setSorting,
  });

  const applyFilters = useCallback(
    (next: AuditFilterValues) => {
      void router.navigate({
        from: "/system-admin/audit",
        to: "/system-admin/audit",
        search: (previous) => ({
          ...previous,
          page: 1,
          q: next.q.trim() || undefined,
          actor: next.actor || undefined,
          event: next.event || undefined,
          source: next.source,
          from: next.from || undefined,
          to: next.to || undefined,
        }),
        replace: true,
        resetScroll: false,
      });
    },
    [router],
  );

  return (
    <div className="audit-events-card center-table-card" aria-busy={isLoading}>
      {filters.account ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-lighter px-5 py-3 text-sm">
          <p>
            Activity by or about one account{" "}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {filters.account}
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              void router.navigate({
                from: "/system-admin/audit",
                to: "/system-admin/audit",
                search: (previous) => ({
                  ...previous,
                  page: 1,
                  source: previous.source ?? "all",
                  account: undefined,
                }),
                resetScroll: false,
              })
            }
          >
            <X aria-hidden="true" /> Show all accounts
          </Button>
        </div>
      ) : null}
      <AuditTableToolbar values={values} onApply={applyFilters} />
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-border-lighter px-6 py-4 text-sm"
        >
          <p>{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
      <Table
        className="audit-events-table center-table"
        aria-label="Audit events"
        aria-rowcount={data.length + 1}
      >
        <colgroup>
          <col style={{ width: 48 }} />
          <col className="w-[18%]" />
          <col className="w-[11%]" />
          <col className="w-[21%]" />
          <col className="w-[22%]" />
          <col className="w-[18%]" />
          <col style={{ width: 100 }} />
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow
              key={group.id}
              className="border-border-lighter hover:bg-transparent"
            >
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-12 px-6 text-xs font-semibold text-muted-foreground"
                  aria-sort={
                    header.column.getIsSorted() === "asc"
                      ? "ascending"
                      : header.column.getIsSorted() === "desc"
                        ? "descending"
                        : undefined
                  }
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
        {isLoading ? (
          <TableBody>
            <AuditTableSkeleton />
          </TableBody>
        ) : data.length ? (
          <AuditTableRows
            rows={table.getRowModel().rows}
            rowOffset={pageIndex * pageSize}
          />
        ) : !error ? (
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={auditColumns.length}
                className="h-48 px-5 text-center"
              >
                <Search
                  className="mx-auto mb-3 size-6 text-muted-foreground/50"
                  aria-hidden="true"
                />
                <p className="font-medium">No audit events found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try another search, source, or date range.
                </p>
              </TableCell>
            </TableRow>
          </TableBody>
        ) : null}
      </Table>
      <CenterTablePagination
        table={table}
        total={total}
        disabled={isLoading || !!error}
        onPageChange={(nextPage) =>
          void router.navigate({
            from: "/system-admin/audit",
            to: "/system-admin/audit",
            search: (previous) => ({
              ...previous,
              source: previous.source ?? "all",
              page: nextPage + 1,
            }),
            resetScroll: false,
          })
        }
        onPageSizeChange={(size) => {
          setPageSize(size);
          void router.navigate({
            from: "/system-admin/audit",
            to: "/system-admin/audit",
            search: (previous) => ({
              ...previous,
              source: previous.source ?? "all",
              page: 1,
            }),
            resetScroll: false,
          });
        }}
      />
      <p role="status" className="sr-only">
        {isLoading
          ? "Loading audit events"
          : error && data.length === 0
            ? "Audit events could not be loaded"
            : `${total} audit event${total === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
