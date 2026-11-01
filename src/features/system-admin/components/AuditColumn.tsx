import type { AppColumnDef } from "~/lib/table";
import { CenterSortHeader, centerSelectionColumn } from "./CenterTableControls";
import { AuditRowActions } from "./AuditRowActions";
import { formatAuditEventType } from "../audit-event.utils";
import type { NormalizedAuditEvent } from "../system-admin.types";

const sourceLabels = {
  system: "System",
  request: "Request",
  "sign-in": "Sign-In",
};

// Reuse formatters instead of constructing two Intl instances for every row.
const auditDate = new Intl.DateTimeFormat("en-US");
const auditTime = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

export const auditColumns: AppColumnDef<NormalizedAuditEvent>[] = [
  centerSelectionColumn<NormalizedAuditEvent>(
    (event) => `${formatAuditEventType(event.eventType)} at ${event.timestamp}`,
  ),
  {
    accessorKey: "timestamp",
    header: ({ column }) => <CenterSortHeader label="Time" column={column} />,
    cell: ({ row }) => (
      <time dateTime={row.original.timestamp}>
        <span className="audit-event-date">
          {auditDate.format(new Date(row.original.timestamp))}
        </span>
        <span className="audit-event-time">
          {auditTime.format(new Date(row.original.timestamp))}
        </span>
      </time>
    ),
  },
  {
    accessorKey: "source",
    header: ({ column }) => <CenterSortHeader label="Source" column={column} />,
    cell: ({ row }) => (
      <span className="audit-source" data-source={row.original.source}>
        {sourceLabels[row.original.source]}
      </span>
    ),
  },
  {
    accessorKey: "eventType",
    header: ({ column }) => <CenterSortHeader label="Event" column={column} />,
    cell: ({ row }) => (
      <span
        className="text-foreground"
        title={
          row.original.requestId
            ? `Request ${row.original.requestId}`
            : (row.original.targetId ?? undefined)
        }
      >
        {formatAuditEventType(row.original.eventType)}
      </span>
    ),
  },
  {
    accessorKey: "actor",
    header: ({ column }) => <CenterSortHeader label="Actor" column={column} />,
  },
  {
    id: "device",
    accessorFn: (event) => event.deviceLabel ?? "",
    header: ({ column }) => <CenterSortHeader label="Device" column={column} />,
    cell: ({ row }) =>
      row.original.deviceLabel || row.original.maskedIpAddress ? (
        <div className="min-w-36">
          <p className="text-foreground/80">
            {row.original.deviceLabel ?? "Unrecognized device"}
          </p>
          {row.original.maskedIpAddress ? (
            <p className="audit-device-address font-mono">
              {row.original.maskedIpAddress}
            </p>
          ) : null}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => <AuditRowActions event={row.original} />,
  },
];
