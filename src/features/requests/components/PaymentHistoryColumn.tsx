import type { AppColumnDef } from "~/lib/table";
import { SortHeader } from "~/components/ui/data-table-column-header";
import { formatPeso } from "~/lib/peso";
import type { PaymentHistoryRow } from "../requests.queries";

function formatVerifiedDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatVerifiedTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const paymentHistoryColumns: AppColumnDef<PaymentHistoryRow>[] = [
  {
    accessorKey: "trackingNumber",
    header: ({ column }) => <SortHeader column={column}>Tracking No.</SortHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-xs font-bold text-primary">
        {row.getValue("trackingNumber")}
      </span>
    ),
  },
  {
    accessorKey: "applicantName",
    header: ({ column }) => <SortHeader column={column}>Applicant</SortHeader>,
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
    header: ({ column }) => <SortHeader column={column}>Service</SortHeader>,
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
    header: ({ column }) => <SortHeader column={column}>OR No.</SortHeader>,
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
      <SortHeader column={column} align="end">
        Fee
      </SortHeader>
    ),
    cell: ({ row }) => (
      <div className="text-right text-sm font-semibold tabular-nums text-foreground">
        {formatPeso(row.original.feesDue)}
      </div>
    ),
  },
  {
    accessorKey: "verifiedAt",
    header: ({ column }) => <SortHeader column={column}>Verified At</SortHeader>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 whitespace-nowrap">
        <span className="text-sm text-foreground">
          {formatVerifiedDate(row.original.verifiedAt)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatVerifiedTime(row.original.verifiedAt)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "verifiedBy",
    header: ({ column }) => <SortHeader column={column}>Verified By</SortHeader>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.verifiedBy}</span>
    ),
  },
];
