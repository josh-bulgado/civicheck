import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useHotkeys, type HotkeyChord } from "@tanstack/react-hotkeys";
import {
  useTable,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import { DataTableCard } from "~/components/ui/data-table-card";
import type { Department } from "~/features/admin/departments.queries";
import {
  EMPTY_FILTERS,
  applyFilterChange,
  type RequestQueueFilters,
} from "../request-queue";
import {
  countByStage,
  countNeedingAttention,
  filterRequests,
  showsPaymentColumn,
} from "../requests-table.utils";
import type { StaffRequestRow } from "../requests.queries";
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
  requests: StaffRequestRow[];
  departments: Department[];
  filters: RequestQueueFilters;
  onFiltersChange: (filters: RequestQueueFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** Staff/supervisor only ever see one department. */
  scopedDepartmentName?: string | null;
  /** The loader's clock. See `createRequestColumns`. */
  now: number;
}

export function RequestsDataTable({
  requests,
  departments,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  scopedDepartmentName,
  now,
}: RequestsDataTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  // Typing stays responsive while a long queue re-filters behind it.
  const deferredSearch = useDeferredValue(search);

  const rows = useMemo(
    () =>
      filterRequests(requests, {
        ...filters,
        search: deferredSearch,
        now,
      }),
    [requests, filters, deferredSearch, now],
  );

  // Each count shows the rows every other filter leaves, so a chip never
  // promises more than the table will show.
  const stageCounts = useMemo(
    () =>
      countByStage(
        filterRequests(requests, {
          ...filters,
          stage: undefined,
          search: deferredSearch,
          now,
        }),
      ),
    [requests, filters, deferredSearch, now],
  );
  const attentionCount = useMemo(
    () =>
      countNeedingAttention(
        filterRequests(requests, {
          ...filters,
          attention: undefined,
          needs: undefined,
          mine: undefined,
          search: deferredSearch,
          now,
        }),
        now,
      ),
    [requests, filters, deferredSearch, now],
  );

  const columns = useMemo(
    () => createRequestColumns({ now, showDepartment: !scopedDepartmentName }),
    [now, scopedDepartmentName],
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
    data: rows,
    columns,
    state: { sorting, columnVisibility: resolvedColumnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  });

  const hasActiveFilters =
    search !== "" ||
    Object.values(filters).some((value) => value !== undefined);

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
            onFiltersChange(applyFilterChange(filters, patch))
          }
          stageCounts={stageCounts}
          attentionCount={attentionCount}
          departments={departments}
          scopedDepartmentName={scopedDepartmentName}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          actions={columnMenu}
        />
      )}
      cellClassName="py-3"
      label="Requests"
      emptyLabel="No requests found matching your filters."
      onClearFilters={clearFilters}
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
