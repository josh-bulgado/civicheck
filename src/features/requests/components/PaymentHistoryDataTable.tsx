import { useDeferredValue, useState } from "react";
import {
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { Receipt } from "lucide-react";
import { DataTableCard } from "~/components/ui/data-table-card";
import type { PaymentRange } from "../payment-history";
import type { PaymentHistoryRow } from "../requests.queries";
import { paymentHistoryColumns } from "./PaymentHistoryColumn";
import { PaymentHistoryToolbar } from "./PaymentHistoryToolbar";
import { appTableFeatures } from "~/lib/table";

interface PaymentHistoryDataTableProps {
  data: PaymentHistoryRow[];
  range: PaymentRange;
  onRangeChange: (range: PaymentRange) => void;
}

export function PaymentHistoryDataTable({
  data,
  range,
  onRangeChange,
}: PaymentHistoryDataTableProps) {
  // Newest first — the cashier is usually checking what just went through.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "verifiedAt", desc: true },
  ]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const table = useTable({
    features: appTableFeatures,
    data,
    columns: paymentHistoryColumns,
    state: { sorting, globalFilter: deferredSearch },
    onSortingChange: setSorting,
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const term = filterValue.toLowerCase();
      const { trackingNumber, applicantName, serviceName, orNumber, verifiedBy } =
        row.original;
      return [trackingNumber, applicantName, serviceName, orNumber ?? "", verifiedBy].some(
        (field) => field.toLowerCase().includes(term),
      );
    },
  });

  const searching = search !== "";

  return (
    <DataTableCard
      table={table}
      toolbar={
        <PaymentHistoryToolbar
          search={search}
          onSearchChange={setSearch}
          range={range}
          onRangeChange={onRangeChange}
        />
      }
      label="Verified payments"
      emptyIcon={Receipt}
      emptyLabel={
        data.length > 0
          ? "No payments match your search."
          : "No payments were verified in this date range."
      }
      onClearFilters={searching ? () => setSearch("") : undefined}
    />
  );
}
