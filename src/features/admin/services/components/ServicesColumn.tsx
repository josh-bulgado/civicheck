import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Service } from "../services.types";

export const columns: ColumnDef<Service>[] = [
  {
    accessorKey: "service_code",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="font-semibold text-slate-700 text-xs uppercase tracking-wider px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Service Code
        <ArrowUpDown className="ml-1 w-3 h-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono font-bold text-xs text-slate-700">
        {row.getValue("service_code")}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="font-semibold text-slate-700 text-xs uppercase tracking-wider px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Service Title
        <ArrowUpDown className="ml-1 w-3 h-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const service = row.original;
      return (
        <div>
          <div
            className="font-medium text-slate-900 line-clamp-1 text-sm"
            title={service.name}
          >
            {service.name}
          </div>
          {service.display_group && (
            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
              Part of group:{" "}
              <span className="font-semibold">{service.display_group}</span>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "classification",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="font-semibold text-slate-700 text-xs uppercase tracking-wider px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Complexity
        <ArrowUpDown className="ml-1 w-3 h-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const classification = row.getValue<string>("classification");
      return (
        <Badge
          variant={
            classification === "simple"
              ? "simple"
              : classification === "complex"
                ? "complex"
                : "highly_technical"
          }
          className="capitalize font-semibold text-[10px]"
        >
          {classification.replace("_", " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "fee",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="font-semibold text-slate-700 text-xs uppercase tracking-wider px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Standard Fee
        <ArrowUpDown className="ml-1 w-3 h-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const fee = row.getValue<number>("fee");
      return (
        <span className="font-semibold text-slate-900 text-sm">
          {fee === 0 || fee === null
            ? "Free / Varies"
            : `₱${Number(fee).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
        </span>
      );
    },
  },
  {
    accessorKey: "processing_time",
    header: () => (
      <span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">
        Processing Time
      </span>
    ),
    cell: ({ row }) => (
      <span
        className="text-slate-600 text-xs truncate max-w-[150px] block"
        title={row.getValue("processing_time")}
      >
        {row.getValue("processing_time") || "N/A"}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => (
      <span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">
        Actions
      </span>
    ),
    cell: ({ row, table }) => {
      const meta = table.options.meta as
        | { onView?: (service: Service) => void }
        | undefined;
      return (
        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            meta?.onView?.(row.original);
          }}
          title="View Service Details"
        >
          <Eye className="w-4 h-4" />
        </Button>
      );
    },
  },
];
