import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { SortHeader } from "~/components/ui/data-table-column-header";
import { formatPesoFee } from "~/features/services/service-utils";
import { cn } from "~/lib/utils";
import { formatRequestDate, getStatusBadgeVariant } from "../request-queue";
import {
  REQUEST_STATUSES,
  STAGE_OF,
  getStatusDetails,
  isRequestStatus,
} from "../request-workflow";
import type { StaffRequestRow } from "../requests.queries";
import {
  formatTimeInStage,
  paymentDisplay,
  requestTurn,
  waitTone,
  waitingRank,
  type WaitTone,
} from "../requests-table.utils";
import { StageTracker } from "./StageTracker";

/** The In stage column's id, so the page can sort by it before any click. */
export const IN_STAGE_COLUMN = "inStage";

const WAIT_CLASS: Record<WaitTone, string> = {
  quiet: "font-medium text-muted-foreground",
  normal: "font-semibold text-foreground",
  warning: "font-semibold text-tone-warning",
  critical: "font-semibold text-tone-danger",
};

function NotApplicable() {
  return <span className="text-sm text-muted-foreground">-</span>;
}

function PaymentCell({ request }: { request: StaffRequestRow }) {
  const display = paymentDisplay(request);
  if (display === "none") return <NotApplicable />;

  return (
    <div className="flex flex-col gap-0.5">
      {display === "not_due" ? (
        <span className="text-sm text-muted-foreground">Not due yet</span>
      ) : (
        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              display === "verified"
                ? "bg-health-success-dot"
                : "bg-health-error-dot",
            )}
          />
          {display === "verified" ? "Verified" : "Unpaid"}
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        {formatPesoFee(request.feesDue)}
      </span>
    </div>
  );
}

function TimeInStage({
  request,
  now,
}: {
  request: StaffRequestRow;
  now: number;
}) {
  // A released or rejected request is not waiting on anyone.
  if (requestTurn(request) === "none") return <NotApplicable />;

  const elapsed = formatTimeInStage(request.updatedAt, now);
  const tone = waitTone(request, now);
  return (
    <span
      className={cn("text-sm tabular-nums", WAIT_CLASS[tone])}
      title={`In this status for ${elapsed}`}
    >
      {elapsed}
      {tone === "warning" || tone === "critical" ? (
        <span className="sr-only"> (a long wait)</span>
      ) : null}
    </span>
  );
}

interface RequestColumnOptions {
  /** The loader's clock, so the server and the browser agree on every age. */
  now: number;
  /** Admins see several departments; a scoped account sees one, so it is noise. */
  showDepartment: boolean;
}

export function createRequestColumns({
  now,
  showDepartment,
}: RequestColumnOptions): ColumnDef<StaffRequestRow>[] {
  return [
    {
      id: "trackingNumber",
      accessorKey: "trackingNumber",
      header: ({ column }) => <SortHeader column={column}>Tracking no.</SortHeader>,
      cell: ({ row }) => (
        <Link
          to="/requests/$requestId"
          params={{ requestId: row.original.id }}
          // The row itself navigates too, so don't let both fire.
          onClick={(e) => e.stopPropagation()}
          // J and K walk these links, so each row is one tab stop.
          data-request-link=""
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {row.original.trackingNumber}
        </Link>
      ),
    },
    {
      id: "applicantName",
      accessorKey: "applicantName",
      header: ({ column }) => <SortHeader column={column}>Applicant</SortHeader>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className="line-clamp-1 text-sm font-medium text-foreground"
            title={row.original.applicantName}
          >
            {row.original.applicantName}
          </span>
          {row.original.isWalkIn ? (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Walk-in
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      id: "serviceName",
      accessorKey: "serviceName",
      header: ({ column }) => <SortHeader column={column}>Service</SortHeader>,
      cell: ({ row }) => (
        <div className="flex max-w-60 flex-col">
          <span className="truncate text-sm" title={row.original.serviceName}>
            {row.original.serviceName}
          </span>
          {showDepartment ? (
            <span className="truncate text-xs text-muted-foreground">
              {row.original.departmentName}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "status",
      // Stage first, then the order statuses are listed in.
      accessorFn: ({ status }) =>
        isRequestStatus(status)
          ? STAGE_OF[status] * 10 + REQUEST_STATUSES.indexOf(status)
          : 0,
      header: ({ column }) => <SortHeader column={column}>Status</SortHeader>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Badge variant={getStatusBadgeVariant(row.original.status)}>
            {getStatusDetails(row.original.status).label}
          </Badge>
          <StageTracker status={row.original.status} />
        </div>
      ),
    },
    {
      id: "payment",
      accessorFn: paymentDisplay,
      header: ({ column }) => <SortHeader column={column}>Payment</SortHeader>,
      cell: ({ row }) => <PaymentCell request={row.original} />,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => <SortHeader column={column}>Submitted</SortHeader>,
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatRequestDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: IN_STAGE_COLUMN,
      accessorFn: waitingRank,
      // The longest wait is what staff look for, so the first click puts it on top.
      sortDescFirst: true,
      header: ({ column }) => <SortHeader column={column}>In stage</SortHeader>,
      cell: ({ row }) => <TimeInStage request={row.original} now={now} />,
    },
    {
      id: "open",
      enableSorting: false,
      header: () => <span className="sr-only">Open request</span>,
      cell: () => (
        <div className="flex justify-end">
          <ChevronRight
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </div>
      ),
    },
  ];
}
