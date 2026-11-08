import type { AppColumnDef } from "~/lib/table";
import { QuietLink as Link } from "~/components/quiet-link";
import { Badge } from "~/components/ui/badge";
import { SortHeader } from "~/components/ui/data-table-column-header";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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
import { isRequestClaimActive } from "../request-claims";
import {
  formatTimeInStage,
  paymentDisplay,
  requestTurn,
  waitTone,
  waitingRank,
  type PaymentDisplay,
  type WaitTone,
} from "../requests-table.utils";

/** The In stage column's id, so the page can sort by it before any click. */
export const IN_STAGE_COLUMN = "inStage";

export const REQUEST_COLUMN_LABELS = {
  trackingNumber: "Tracking no.",
  applicantName: "Applicant",
  serviceName: "Service",
  departmentName: "Department",
  status: "Status",
  handler: "Handler",
  payment: "Payment",
  createdAt: "Submitted",
  [IN_STAGE_COLUMN]: "In stage",
} as const;

const WAIT_CLASS: Record<WaitTone, string> = {
  quiet: "font-medium text-muted-foreground",
  normal: "font-semibold text-foreground",
  warning: "font-semibold text-tone-warning",
  critical: "font-semibold text-tone-danger",
};

const PAYMENT_DETAILS: Record<
  Exclude<PaymentDisplay, "none">,
  { label: string; dot: string }
> = {
  paid: { label: "Paid", dot: "bg-health-success-dot" },
  unpaid: { label: "Unpaid", dot: "bg-health-error-dot" },
  no_fee: { label: "No fee", dot: "bg-health-neutral-dot" },
};

function NotApplicable() {
  return <span className="text-sm text-muted-foreground">-</span>;
}

function PaymentCell({ request }: { request: StaffRequestRow }) {
  const display = paymentDisplay(request);
  if (display === "none") return <NotApplicable />;
  const details = PAYMENT_DETAILS[display];

  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", details.dot)}
        />
        {details.label}
      </span>
      {request.feesDue > 0 ? (
        <span className="text-xs text-muted-foreground">
          {formatPesoFee(request.feesDue)}
        </span>
      ) : null}
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
  const closed = requestTurn(request) === "none";

  // A released or rejected request is not waiting on anyone.
  if (closed) return <NotApplicable />;

  const elapsed = formatTimeInStage(request.updatedAt, now);
  const tone = waitTone(request, now);
  return (
    <span
      className={cn("text-sm whitespace-nowrap tabular-nums", WAIT_CLASS[tone])}
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
  /** One shared clock, initially the loader's so SSR and hydration agree. */
  now: number;
  /** Admins see several departments; a scoped account sees one, so it is noise. */
  showDepartment: boolean;
}

export function createRequestColumns({
  now,
  showDepartment,
}: RequestColumnOptions): AppColumnDef<StaffRequestRow>[] {
  const departmentColumn: AppColumnDef<StaffRequestRow> = {
    id: "departmentName",
    accessorKey: "departmentName",
    header: ({ column }) => (
      <SortHeader column={column}>
        {REQUEST_COLUMN_LABELS.departmentName}
      </SortHeader>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.departmentName}
      </span>
    ),
  };

  return [
    {
      id: "trackingNumber",
      accessorKey: "trackingNumber",
      enableHiding: false,
      header: ({ column }) => (
        <SortHeader column={column}>
          {REQUEST_COLUMN_LABELS.trackingNumber}
        </SortHeader>
      ),
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
      header: ({ column }) => (
        <SortHeader column={column}>
          {REQUEST_COLUMN_LABELS.applicantName}
        </SortHeader>
      ),
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
      header: ({ column }) => (
        <SortHeader column={column}>
          {REQUEST_COLUMN_LABELS.serviceName}
        </SortHeader>
      ),
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="block min-w-72 max-w-96 truncate text-sm" />
            }
          >
            {row.original.serviceName}
          </TooltipTrigger>
          <TooltipContent align="start">
            {row.original.serviceName}
          </TooltipContent>
        </Tooltip>
      ),
    },
    ...(showDepartment ? [departmentColumn] : []),
    {
      id: "status",
      // Stage first, then the order statuses are listed in.
      accessorFn: ({ status }) =>
        isRequestStatus(status)
          ? STAGE_OF[status] * 10 + REQUEST_STATUSES.indexOf(status)
          : 0,
      header: ({ column }) => (
        <SortHeader column={column}>{REQUEST_COLUMN_LABELS.status}</SortHeader>
      ),
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.status)}>
          {getStatusDetails(row.original.status).label}
        </Badge>
      ),
    },
    {
      id: "handler",
      accessorFn: ({ claim, status }) =>
        isRequestClaimActive(claim, status, now)
          ? claim.isMine
            ? "You"
            : claim.staffName
          : "Available",
      header: ({ column }) => (
        <SortHeader column={column}>{REQUEST_COLUMN_LABELS.handler}</SortHeader>
      ),
      cell: ({ row }) => {
        const claim = row.original.claim;
        if (!isRequestClaimActive(claim, row.original.status, now)) {
          return <span className="text-sm text-muted-foreground">Available</span>;
        }
        return (
          <Badge variant={claim.isMine ? "success" : "warning"}>
            {claim.isMine ? "You" : claim.staffName}
          </Badge>
        );
      },
    },
    {
      id: "payment",
      accessorFn: paymentDisplay,
      header: ({ column }) => (
        <SortHeader column={column}>{REQUEST_COLUMN_LABELS.payment}</SortHeader>
      ),
      cell: ({ row }) => <PaymentCell request={row.original} />,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <SortHeader column={column}>
          {REQUEST_COLUMN_LABELS.createdAt}
        </SortHeader>
      ),
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
      header: ({ column }) => (
        <SortHeader column={column}>
          {REQUEST_COLUMN_LABELS[IN_STAGE_COLUMN]}
        </SortHeader>
      ),
      cell: ({ row }) => <TimeInStage request={row.original} now={now} />,
    },
  ];
}
