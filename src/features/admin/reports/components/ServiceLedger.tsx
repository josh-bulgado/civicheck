import { useCallback, useMemo, useState } from "react";
import {
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { Download } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DataTableCard } from "~/components/ui/data-table-card";
import { SortHeader } from "~/components/ui/data-table-column-header";
import {
  FilterChips,
  TableSearch,
  type FilterChipOption,
} from "~/components/ui/data-table-toolbar";
import { ALL_DEPARTMENTS } from "~/features/admin/department-filter";
import type { Department } from "~/features/admin/departments.queries";
import {
  THIN_RELEASE_SAMPLE,
  formatCount,
  formatDays,
} from "~/features/admin/reports/report-summary";
import { shareOf } from "~/features/admin/reports/service-report";
import type { ServiceReportRow } from "~/features/admin/reports/service-report.queries";
import {
  countByDepartment,
  matchesServiceDepartment,
  matchesServiceSearch,
  servicesToCsv,
} from "~/features/admin/reports/services-ledger";
import { downloadCsv } from "~/lib/csv";
import { appTableFeatures, type AppColumnDef } from "~/lib/table";

interface ServiceLedgerProps {
  rows: ReadonlyArray<ServiceReportRow>;
  departments: ReadonlyArray<Department>;
  /** The service whose patterns are open beside the table. */
  selectedKey: string | null;
  onSelect: (key: string) => void;
  months: number;
}

const DEFAULT_SORT: SortingState = [{ id: "total", desc: true }];

/** The ledger is short enough to show whole: one page, with the footer for the rare long list. */
const PAGE_SIZE = 50;

/**
 * Every service in the period on one sortable table, in the shape of the
 * Services and Staff registries: search, department chips, rows you press.
 * Pressing a row opens that service's patterns beside the table.
 */
export function ServiceLedger({
  rows,
  departments,
  selectedKey,
  onSelect,
  months,
}: ServiceLedgerProps) {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORT);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL_DEPARTMENTS);

  const departmentNames = useMemo(
    () => new Map(departments.map(({ id, name }) => [id, name])),
    [departments],
  );
  const departmentName = useCallback(
    (id: string | null) => (id ? (departmentNames.get(id) ?? id) : "Unassigned"),
    [departmentNames],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          matchesServiceSearch(row, query) && matchesServiceDepartment(row, department),
      ),
    [rows, query, department],
  );

  const maxTotal = useMemo(
    () => Math.max(1, ...rows.map((row) => row.total)),
    [rows],
  );
  const totalRequests = useMemo(
    () => rows.reduce((sum, row) => sum + row.total, 0),
    [rows],
  );

  const columns = useMemo<AppColumnDef<ServiceReportRow>[]>(
    () => [
      {
        id: "label",
        accessorKey: "label",
        header: ({ column }) => <SortHeader column={column}>Service</SortHeader>,
        cell: ({ row }) => (
          <div className="min-w-56 max-w-sm">
            <button
              type="button"
              aria-pressed={row.original.key === selectedKey}
              onClick={() => onSelect(row.original.key)}
              className="rounded-sm text-left text-base font-semibold text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {row.original.label}
            </button>
            <span className="block text-sm text-muted-foreground">
              {departmentName(row.original.departmentId)}
            </span>
          </div>
        ),
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => (
          <SortHeader column={column} align="end">
            Requests
          </SortHeader>
        ),
        cell: ({ row }) => {
          const share = shareOf(row.original.total, totalRequests);
          return (
            <div className="flex items-center justify-end gap-3">
              <span
                aria-hidden="true"
                className="hidden h-2 w-16 overflow-hidden rounded-full bg-muted 2xl:block"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(row.original.total / maxTotal) * 100}%` }}
                />
              </span>
              <span className="text-base font-bold tabular-nums">
                {formatCount(row.original.total)}
              </span>
              {share !== null ? (
                <span className="w-12 text-right text-sm text-muted-foreground tabular-nums">
                  {share}%
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "avgReleaseDays",
        // Services with no release sort last either way rather than as "0 days".
        accessorFn: (row) => row.avgReleaseDays ?? undefined,
        sortUndefined: "last",
        header: ({ column }) => (
          <SortHeader column={column} align="end">
            Avg. days
          </SortHeader>
        ),
        cell: ({ row }) =>
          row.original.avgReleaseDays === null ? (
            <span className="block text-right text-muted-foreground">—</span>
          ) : (
            <span className="block text-right tabular-nums">
              <span className="text-base font-semibold">
                {formatDays(row.original.avgReleaseDays)}
              </span>
              <span className="block whitespace-nowrap text-xs text-muted-foreground">
                from {formatCount(row.original.releaseSample)}
                {row.original.releaseSample < THIN_RELEASE_SAMPLE ? " *" : ""}
              </span>
            </span>
          ),
      },
      {
        id: "incomplete",
        accessorKey: "incomplete",
        header: ({ column }) => (
          <SortHeader column={column} align="end">
            Sent back
          </SortHeader>
        ),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {row.original.incomplete > 0 ? (
              <Badge variant="warning">{formatCount(row.original.incomplete)}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
        ),
      },
      {
        id: "pending",
        accessorKey: "pending",
        header: ({ column }) => (
          <SortHeader column={column} align="end">
            Still open
          </SortHeader>
        ),
        cell: ({ row }) => (
          <span className="block text-right text-base font-semibold tabular-nums">
            {formatCount(row.original.pending)}
          </span>
        ),
      },
    ],
    [departmentName, maxTotal, onSelect, selectedKey, totalRequests],
  );

  const table = useTable({
    features: appTableFeatures,
    data: visibleRows as ServiceReportRow[],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row) => row.key,
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
  });

  const chips = useMemo<FilterChipOption<string>[]>(() => {
    const counts = countByDepartment(rows, query);
    const present = new Set(rows.map((row) => row.departmentId));
    return [
      { value: ALL_DEPARTMENTS, label: "All", count: counts[ALL_DEPARTMENTS] ?? 0 },
      ...departments
        .filter(({ id }) => present.has(id))
        .map(({ id, name }) => ({ value: id, label: name, count: counts[id] ?? 0 })),
    ];
  }, [departments, query, rows]);

  const clearFilters = () => {
    setQuery("");
    setDepartment(ALL_DEPARTMENTS);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <DataTableCard
        table={table}
        className="min-w-0"
        label="Services"
        emptyLabel="No service matches your search."
        onClearFilters={clearFilters}
        cellClassName="align-top whitespace-normal"
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <TableSearch
              value={query}
              onChange={setQuery}
              placeholder="Search services"
              label="Search services"
            />
            <FilterChips
              label="Filter by department"
              value={department}
              onValueChange={setDepartment}
              options={chips}
            />
            <Button
              variant="ghost"
              size="lg"
              className="ml-auto"
              onClick={() =>
                downloadCsv(
                  servicesToCsv(visibleRows as ServiceReportRow[], departmentName),
                  `services-report-${months}-months.csv`,
                )
              }
            >
              <Download aria-hidden="true" data-icon="inline-start" />
              Export CSV
            </Button>
          </div>
        }
        getRowProps={(row) => ({
          // The service name is the keyboard-reachable control; this lets a
          // mouse click anywhere on the row do the same.
          onClick: () => onSelect(row.original.key),
          "data-state": row.original.key === selectedKey ? "selected" : undefined,
          className:
            "cursor-pointer transition-[background-color] data-[state=selected]:bg-primary-soft data-[state=selected]:shadow-[inset_3px_0_0_var(--primary)]",
        })}
      />
      <p className="px-1 text-sm text-muted-foreground">
        * Based on fewer than {THIN_RELEASE_SAMPLE} releases: too few to compare with other
        services.
      </p>
    </div>
  );
}
