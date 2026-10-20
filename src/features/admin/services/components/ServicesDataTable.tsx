import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
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
import {
  columns,
  matchesDepartment,
  type ServiceDossier,
} from "./ServicesColumn";
import { ALL_DEPARTMENTS, ServicesTableToolbar } from "./ServicesTableToolbar";
import { Button } from "~/components/ui/button";
import { DataTablePagination } from "~/components/ui/data-table-pagination";
import {
  EDIT_SERVICE_HOTKEY,
  NEXT_SERVICE_HOTKEY,
  PREVIOUS_SERVICE_HOTKEY,
  ServiceInspector,
} from "~/features/services/components/ServiceInspector";
import { useMediaQuery } from "~/hooks/use-media-query";
import { useHotkeys } from "@tanstack/react-hotkeys";
import type { Department } from "~/features/admin/departments.queries";
import {
  countByClassification,
  matchesSearch,
  neighbourCode,
  type ClassificationFilter,
} from "../services-table.utils";

interface ServicesDataTableProps {
  data: ServiceDossier[];
  departments: Department[];
  /** Opens the editor for a service, or the group editor when it has variants. */
  onEdit: (service: ServiceDossier) => void;
}

/** Wide enough to dock the detail panel beside the table. */
const DOCK_QUERY = "(min-width: 1280px)";

const ALL_COLUMNS: VisibilityState = {};
const DOCKED_COLUMNS: VisibilityState = { department: false, fee: false };

export function ServicesDataTable({
  data,
  departments,
  onEdit,
}: ServicesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [classificationFilter, setClassificationFilter] =
    useState<ClassificationFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const docked = useMediaQuery(DOCK_QUERY);
  const showDock = docked && selectedKey !== null;

  // The panel already shows the fee and the table now shares its row with it,
  // so the two columns that can be read there give way.
  const columnVisibility = showDock ? DOCKED_COLUMNS : ALL_COLUMNS;

  const onView = useCallback(
    (service: ServiceDossier) => setSelectedKey(service.dossier_key),
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
    globalFilterFn: (row, _columnId, filterValue: string) =>
      matchesSearch(row.original, filterValue),
    meta: { onView },
  });

  // The chips show how many services each classification has among the rows the
  // search and department filters leave, so a chip never promises more than the
  // table will show.
  const classificationCounts = useMemo(
    () =>
      countByClassification(
        data.filter(
          (service) =>
            matchesSearch(service, globalFilter) &&
            matchesDepartment(service, departmentFilter),
        ),
      ),
    [data, globalFilter, departmentFilter],
  );

  const handleClassificationFilter = (value: ClassificationFilter) => {
    setClassificationFilter(value);
    if (value === "all") {
      table.getColumn("classification")?.setFilterValue(undefined);
    } else {
      table.getColumn("classification")?.setFilterValue(value);
    }
  };

  const handleDepartmentFilter = (value: string) => {
    setDepartmentFilter(value);
    table
      .getColumn("department")
      ?.setFilterValue(value === ALL_DEPARTMENTS ? undefined : value);
  };

  const handleClearFilters = () => {
    setGlobalFilter("");
    handleClassificationFilter("all");
    handleDepartmentFilter(ALL_DEPARTMENTS);
  };

  // The sheet steps through every row the filters leave, in the order the table
  // shows them, not just the rows on the current page.
  const orderedKeys = table
    .getPrePaginationRowModel()
    .rows.map((row) => row.original.dossier_key);
  const selected = data.find((row) => row.dossier_key === selectedKey) ?? null;
  const selectedIndex = selected
    ? orderedKeys.indexOf(selected.dossier_key)
    : -1;
  const previousKey = selected
    ? neighbourCode(orderedKeys, selected.dossier_key, -1)
    : null;
  const nextKey = selected
    ? neighbourCode(orderedKeys, selected.dossier_key, 1)
    : null;

  const handleEdit = (service: ServiceDossier) => {
    setSelectedKey(null);
    onEdit(service);
  };

  // J and K walk the list, E edits the open service. Plain keys are ignored
  // while a field has focus, so typing in the search box is unaffected. With
  // nothing open, J opens the first service.
  useHotkeys([
    {
      hotkey: NEXT_SERVICE_HOTKEY,
      callback: () => {
        if (!selected) setSelectedKey(orderedKeys[0] ?? null);
        else if (nextKey) setSelectedKey(nextKey);
      },
    },
    {
      hotkey: PREVIOUS_SERVICE_HOTKEY,
      callback: () => {
        if (selected && previousKey) setSelectedKey(previousKey);
      },
    },
    {
      hotkey: EDIT_SERVICE_HOTKEY,
      callback: () => {
        if (selected) handleEdit(selected);
      },
    },
  ]);

  // With the table in view beside the panel, stepping to a service on another
  // page has to bring that page and row along.
  useEffect(() => {
    if (!docked || selectedKey === null || selectedIndex < 0) return;
    const { pageIndex, pageSize } = table.getState().pagination;
    const page = Math.floor(selectedIndex / pageSize);
    if (page !== pageIndex) table.setPageIndex(page);
    const frame = requestAnimationFrame(() => {
      document
        .querySelector(`[data-dossier-key="${CSS.escape(selectedKey)}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, docked]);

  return (
    <div className="flex items-start gap-4">
      {/* One card: filters, table, pagination. */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border-strong bg-card">
        <div className="border-b border-border px-5 py-4">
          <ServicesTableToolbar
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            classificationFilter={classificationFilter}
            onClassificationFilterChange={handleClassificationFilter}
            classificationCounts={classificationCounts}
            departments={departments}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={handleDepartmentFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-border bg-surface-subtle">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="[&>:first-child]:pl-5 [&>:last-child]:pr-5"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
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
            <TableBody className="civic-stagger-auto">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    // The service title is the keyboard-reachable control; this
                    // lets a mouse click anywhere on the row do the same.
                    onClick={() => onView(row.original)}
                    data-dossier-key={row.original.dossier_key}
                    data-state={
                      row.original.dossier_key === selectedKey
                        ? "selected"
                        : undefined
                    }
                    className="cursor-pointer transition-[background-color] hover:bg-surface-subtle data-[state=selected]:bg-primary-soft data-[state=selected]:shadow-[inset_3px_0_0_var(--primary)] [&>:first-child]:pl-5 [&>:last-child]:pr-5"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SlidersHorizontal
                        aria-hidden="true"
                        className="size-8 text-muted-foreground/50"
                      />
                      <p className="text-sm font-medium">
                        No services found matching your filters.
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-xs h-auto p-0"
                      >
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
        <div className="border-t border-border px-5 py-4">
          <DataTablePagination table={table} />
        </div>
      </div>

      <ServiceInspector
        service={selected}
        docked={docked}
        editLabel={
          selected && selected.variant_count > 1
            ? "Manage Service Group"
            : "Edit Service"
        }
        onClose={() => setSelectedKey(null)}
        onEdit={handleEdit}
        navigation={
          selectedIndex >= 0
            ? {
                position: selectedIndex + 1,
                total: orderedKeys.length,
                onPrevious: previousKey
                  ? () => setSelectedKey(previousKey)
                  : undefined,
                onNext: nextKey ? () => setSelectedKey(nextKey) : undefined,
              }
            : undefined
        }
      />
    </div>
  );
}
