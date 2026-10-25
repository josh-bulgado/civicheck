import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatAuditEventType } from "../audit-event.utils";
import type { NormalizedAuditEvent } from "../system-admin.types";

function SortableHeader({
  label,
  column,
}: {
  label: string;
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (descending: boolean) => void;
  };
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="flex h-9 items-center gap-1.5 rounded-sm text-left"
      onClick={() => column.toggleSorting(sorted === "asc")}
      aria-label={`Sort by ${label.toLowerCase()}${sorted ? `, currently ${sorted === "asc" ? "ascending" : "descending"}` : ""}`}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="size-3" aria-hidden="true" />
      ) : null}
      {sorted === "desc" ? (
        <ArrowDown className="size-3" aria-hidden="true" />
      ) : null}
    </button>
  );
}

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

export const auditColumns: ColumnDef<NormalizedAuditEvent>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => <SortableHeader label="Time" column={column} />,
    cell: ({ row }) => (
      <time dateTime={row.original.timestamp} className="block">
        <span className="block font-medium">
          {auditDate.format(new Date(row.original.timestamp))}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {auditTime.format(new Date(row.original.timestamp))}
        </span>
      </time>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs leading-5 font-medium ${row.original.source === "system" ? "bg-secondary text-primary-hover" : "bg-primary-soft text-primary"}`}
      >
        {sourceLabels[row.original.source]}
      </span>
    ),
  },
  {
    accessorKey: "eventType",
    header: ({ column }) => <SortableHeader label="Event" column={column} />,
    cell: ({ row }) => (
      <span
        className="font-medium text-foreground/85"
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
    header: ({ column }) => <SortableHeader label="Actor" column={column} />,
  },
  {
    id: "device",
    header: "Device",
    cell: ({ row }) =>
      row.original.deviceLabel || row.original.maskedIpAddress ? (
        <div className="min-w-36">
          <p className="text-foreground/80">
            {row.original.deviceLabel ?? "Unrecognized device"}
          </p>
          {row.original.maskedIpAddress ? (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {row.original.maskedIpAddress}
            </p>
          ) : null}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];
