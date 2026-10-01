import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "~/components/ui/data-table-column-header";
import type { PaymentHistoryRow } from "../requests.queries";

export function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatVerifiedAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const paymentHistoryColumns: ColumnDef<PaymentHistoryRow>[] = [
  {
    accessorKey: "trackingNumber",
    header: ({ column }) => <SortableHeader column={column} label="Tracking No." />,
    cell: ({ row }) => (
      <span className="font-mono text-xs font-bold text-primary">
        {row.getValue("trackingNumber")}
      </span>
    ),
  },
  {
    accessorKey: "applicantName",
    header: ({ column }) => <SortableHeader column={column} label="Applicant" />,
    cell: ({ row }) => (
      <span
        className="line-clamp-1 text-sm font-medium text-foreground"
        title={row.original.applicantName}
      >
        {row.original.applicantName}
      </span>
    ),
  },
  {
    accessorKey: "serviceName",
    header: ({ column }) => <SortableHeader column={column} label="Service" />,
    cell: ({ row }) => (
      <span
        className="block max-w-[220px] truncate text-sm text-muted-foreground"
        title={row.original.serviceName}
      >
        {row.original.serviceName}
      </span>
    ),
  },
  {
    accessorKey: "orNumber",
    header: ({ column }) => <SortableHeader column={column} label="OR No." />,
    cell: ({ row }) =>
      row.original.orNumber ? (
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.original.orNumber}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "feesDue",
    header: ({ column }) => (
      <div className="flex justify-end">
        <SortableHeader column={column} label="Fee" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right text-sm font-semibold tabular-nums text-foreground">
        {formatPeso(row.original.feesDue)}
      </div>
    ),
  },
  {
    accessorKey: "verifiedAt",
    header: ({ column }) => <SortableHeader column={column} label="Verified At" />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatVerifiedAt(row.original.verifiedAt)}
      </span>
    ),
  },
  {
    accessorKey: "verifiedBy",
    header: ({ column }) => <SortableHeader column={column} label="Verified By" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.verifiedBy}</span>
    ),
  },
];
