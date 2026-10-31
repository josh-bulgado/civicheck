import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  type CellData,
  type Column,
  type ColumnDef,
  type Row,
  type RowData,
  type ReactTable,
} from "@tanstack/react-table";

/** Shared Table v9 features used by the app's data-table components. */
export const appTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns,
  sortFns,
});

export type AppTableFeatures = typeof appTableFeatures;
export type AppColumn<
  TData extends RowData,
  TValue extends CellData = CellData,
> = Column<
  AppTableFeatures,
  TData,
  TValue
>;
export type AppColumnDef<TData extends RowData> = ColumnDef<
  AppTableFeatures,
  TData
>;
export type AppRow<TData extends RowData> = Row<AppTableFeatures, TData>;
export type AppTable<TData extends RowData> = ReactTable<
  AppTableFeatures,
  TData
>;
