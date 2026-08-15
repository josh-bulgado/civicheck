import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { NormalizedAuditEvent } from "../system-admin.types";

const headerClassName =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

function SortableHeader({
  label,
  column,
}: {
  label: string;
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (descending: boolean) => void };
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`${headerClassName} -ml-3 h-8 hover:bg-transparent hover:text-foreground`}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="size-3" />
    </Button>
  );
}

export const auditColumns: ColumnDef<NormalizedAuditEvent>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => <SortableHeader label="Time" column={column} />,
    cell: ({ row }) => (
      <div className="min-w-40">
        <p className="font-medium text-foreground">
          {new Date(row.original.timestamp).toLocaleDateString()}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {new Date(row.original.timestamp).toLocaleTimeString()}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "source",
    header: () => <span className={headerClassName}>Source</span>,
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.original.source}
      </Badge>
    ),
  },
  {
    accessorKey: "eventType",
    header: ({ column }) => <SortableHeader label="Event" column={column} />,
    cell: ({ row }) => (
      <span className="font-medium capitalize text-foreground/85">
        {row.original.eventType.replaceAll("_", " ")}
      </span>
    ),
  },
  {
    accessorKey: "actor",
    header: ({ column }) => <SortableHeader label="Actor" column={column} />,
    cell: ({ row }) => (
      <span className="text-foreground/80">{row.original.actor}</span>
    ),
  },
  {
    id: "target",
    header: () => <span className={headerClassName}>Target</span>,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.requestId
          ? `Request ${row.original.requestId}`
          : (row.original.targetId ?? "—")}
      </span>
    ),
  },
];
