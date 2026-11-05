import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useHotkeys, type HotkeyChord } from "@tanstack/react-hotkeys";
import {
  useTable,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import { DataTableCard } from "~/components/ui/data-table-card";
import { DataTablePagination } from "~/components/ui/data-table-pagination";
import type { Department } from "~/features/admin/departments.queries";
import {
  EMPTY_FILTERS,
  applyFilterChange,
  type RequestQueueFilters,
} from "../request-queue";
import { showsPaymentColumn } from "../requests-table.utils";
import type { RequestQueuePage } from "../requests.queries";
import {
  IN_STAGE_COLUMN,
  REQUEST_COLUMN_LABELS,
  createRequestColumns,
} from "./RequestsColumn";
import { RequestsTableToolbar } from "./RequestsTableToolbar";
import { appTableFeatures } from "~/lib/table";

/** Longest wait first: the oldest thing someone is waiting on is row one. */
const DEFAULT_SORTING: SortingState = [{ id: IN_STAGE_COLUMN, desc: true }];
const COLUMN_LABELS_WITHOUT_PAYMENT = Object.fromEntries(
  Object.entries(REQUEST_COLUMN_LABELS).filter(([id]) => id !== "payment"),
);

const NEXT_REQUEST_HOTKEY: HotkeyChord = "J";
const PREVIOUS_REQUEST_HOTKEY: HotkeyChord = "K";

/**
 * Moves focus to the next or previous request link. The links are the rows'
 * one tab stop, so focus lands on something Enter can open. With nothing
 * focused yet, either key lands on the first row.
 */
function focusRequestLink(step: 1 | -1) {
  const links = Array.from(
    document.querySelectorAll<HTMLElement>("[data-request-link]"),
  );
  if (links.length === 0) return;
  const current = links.indexOf(document.activeElement as HTMLElement);
  const next =
    current === -1
      ? 0
      : Math.min(links.length - 1, Math.max(0, current + step));
  links[next].focus();
  links[next].scrollIntoView({ block: "nearest" });
}

interface RequestsDataTableProps {
  queue: RequestQueuePage;
  departments: Department[];
  filters: RequestQueueFilters;
  onFiltersChange: (filters: RequestQueueFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** Staff/supervisor only ever see one department. */
  scopedDepartmentName?: string | null;
}

export function RequestsDataTable({
  queue,
  departments,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  scopedDepartmentName,
}: RequestsDataTableProps) {
  const navigate = useNavigate();
  const isQueueLoading = useRouterState({
    select: (state) =>
      state.isLoading &&
      (state.location.pathname === "/requests" ||
        state.location.pathname === "/requests/"),
  });
  const [showLoadingRows, setShowLoadingRows] = useState(false);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});

  useEffect(() => {
    if (!isQueueLoading) {
      setShowLoadingRows(false);
      return;
    }
    const timeout = window.setTimeout(() => setShowLoadingRows(true), 250);
    return () => window.clearTimeout(timeout);
  }, [isQueueLoading]);
  const sorting = useMemo<SortingState>(
    () =>
      filters.sort
        ? [{ id: filters.sort, desc: filters.desc ?? false }]
        : DEFAULT_SORTING,
    [filters.desc, filters.sort],
  );
  const pagination = useMemo(
    () => ({ pageIndex: queue.page, pageSize: queue.pageSize }),
    [queue.page, queue.pageSize],
  );

  const columns = useMemo(
    () =>
      createRequestColumns({
        now: queue.now,
        showDepartment: !scopedDepartmentName,
      }),
    [queue.now, scopedDepartmentName],
  );
  const paymentColumnIsAvailable = showsPaymentColumn(filters);
  const resolvedColumnVisibility = useMemo(
    () =>
      paymentColumnIsAvailable
        ? columnVisibility
        : { ...columnVisibility, payment: false },
    [columnVisibility, paymentColumnIsAvailable],
  );

  const table = useTable({
    features: appTableFeatures,
    data: queue.rows,
    columns,
    state: {
      sorting,
      pagination,
      columnVisibility: resolvedColumnVisibility,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const sort = next[0] ?? DEFAULT_SORTING[0];
      onFiltersChange({
        ...filters,
        sort: sort.id as RequestQueueFilters["sort"],
        desc: sort.desc,
        page: undefined,
      });
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      onFiltersChange({
        ...filters,
        page: next.pageIndex || undefined,
        pageSize: next.pageSize as RequestQueueFilters["pageSize"],
      });
    },
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: true,
    manualSorting: true,
    rowCount: queue.total,
    autoResetPageIndex: false,
  });

  const hasActiveFilters =
    search !== "" ||
    [
      filters.stage,
      filters.status,
      filters.payment,
      filters.department,
      filters.needs,
      filters.mine,
      filters.attention,
    ].some((value) => value !== undefined);

  const clearFilters = () => {
    onSearchChange("");
    onFiltersChange(EMPTY_FILTERS);
  };

  // J and K walk the list and Enter opens a request. Plain keys are ignored
  // while a field has focus, so typing in the search box is unaffected.
  useHotkeys([
    { hotkey: NEXT_REQUEST_HOTKEY, callback: () => focusRequestLink(1) },
    { hotkey: PREVIOUS_REQUEST_HOTKEY, callback: () => focusRequestLink(-1) },
  ]);

  return (
    <DataTableCard
      table={table}
      columnLabels={
        paymentColumnIsAvailable
          ? REQUEST_COLUMN_LABELS
          : COLUMN_LABELS_WITHOUT_PAYMENT
      }
      toolbar={(columnMenu) => (
        <RequestsTableToolbar
          search={search}
          onSearchChange={onSearchChange}
          filters={filters}
          onFilterChange={(patch) =>
            onFiltersChange({
              ...applyFilterChange(filters, patch),
              page: undefined,
            })
          }
          stageCounts={queue.stageCounts}
          attentionCount={queue.attentionCount}
          departments={departments}
          scopedDepartmentName={scopedDepartmentName}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          actions={columnMenu}
        />
      )}
      cellClassName="py-3"
      label="Requests"
      loading={isQueueLoading && showLoadingRows}
      emptyLabel="No requests found matching your filters."
      onClearFilters={clearFilters}
      footer={
        <DataTablePagination
          table={table}
          pageCount={Math.ceil(queue.total / queue.pageSize)}
          total={queue.total}
          disabled={isQueueLoading}
          onPageChange={(page) =>
            onFiltersChange({
              ...filters,
              page: page || undefined,
            })
          }
          onPageSizeChange={(pageSize) =>
            onFiltersChange({
              ...filters,
              page: undefined,
              pageSize: pageSize as RequestQueueFilters["pageSize"],
            })
          }
        />
      }
      getRowProps={(row) => ({
        // The tracking number is the keyboard-reachable control; this lets a
        // mouse click anywhere on the row open the request too.
        onClick: () =>
          navigate({
            to: "/requests/$requestId",
            params: { requestId: row.original.id },
          }),
        className:
          "cursor-pointer active:bg-secondary has-[[data-request-link]:focus-visible]:bg-primary-soft",
      })}
    />
  );
}
