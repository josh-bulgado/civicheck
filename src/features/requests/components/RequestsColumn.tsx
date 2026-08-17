import { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  formatRequestDate,
  getPaymentBadgeVariant,
  getStatusBadgeVariant,
  UNASSIGNED_DEPARTMENT_FILTER,
} from "../request-queue";
import { getPaymentDetails, getStatusDetails } from "../request-workflow";
import type { StaffRequestRow } from "../requests.queries";

function SortableHeader({
  column,
  label,
}: {
  column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | string };
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-transparent"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-1 w-3 h-3" />
    </Button>
  );
}

export const columns: ColumnDef<StaffRequestRow>[] = [
  {
    accessorKey: "trackingNumber",
    header: ({ column }) => <SortableHeader column={column} label="Tracking No." />,
    cell: ({ row }) => (
      <Link
        to="/requests/$requestId"
        params={{ requestId: row.original.id }}
        // The row itself navigates too — don't let both fire.
        onClick={(e) => e.stopPropagation()}
        className="font-mono text-xs font-bold text-primary hover:underline"
      >
        {row.getValue("trackingNumber")}
      </Link>
    ),
  },
  {
    accessorKey: "applicantName",
    header: ({ column }) => <SortableHeader column={column} label="Applicant" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span
          className="line-clamp-1 text-sm font-medium text-foreground"
          title={row.original.applicantName}
        >
          {row.original.applicantName}
        </span>
        {row.original.isWalkIn && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            Walk-in
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "serviceName",
    header: ({ column }) => <SortableHeader column={column} label="Service" />,
    cell: ({ row }) => (
      <span
        className="block max-w-[220px] truncate text-sm text-muted-foreground"
        title={row.getValue("serviceName")}
      >
        {row.getValue("serviceName")}
      </span>
    ),
  },
  {
    accessorKey: "departmentName",
    header: ({ column }) => <SortableHeader column={column} label="Department" />,
    // Filtered by department id (or the "unassigned" sentinel), not by label.
    filterFn: (row, _columnId, filterValue: string) =>
      filterValue === UNASSIGNED_DEPARTMENT_FILTER
        ? row.original.departmentId == null
        : row.original.departmentId === filterValue,
    cell: ({ row }) =>
      row.original.departmentId ? (
        <Badge variant="neutral" className="font-semibold text-[10px]">
          {row.getValue("departmentName")}
        </Badge>
      ) : (
        <span className="text-xs italic text-muted-foreground">Unassigned</span>
      ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} label="Status" />,
    cell: ({ row }) => (
      <Badge variant={getStatusBadgeVariant(row.original.status)}>
        {getStatusDetails(row.original.status).label}
      </Badge>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: ({ column }) => <SortableHeader column={column} label="Payment" />,
    cell: ({ row }) => (
      <Badge variant={getPaymentBadgeVariant(row.original.paymentStatus)}>
        {getPaymentDetails(row.original.paymentStatus).label}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader column={column} label="Submitted" />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatRequestDate(row.original.createdAt)}
      </span>
    ),
  },
];
