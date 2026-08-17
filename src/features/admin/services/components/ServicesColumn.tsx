import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, Pencil } from "lucide-react";
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
        className="px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Service Code
        <ArrowUpDown className="ml-1 w-3 h-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs font-bold text-foreground">
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
        className="px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-transparent"
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
            className="line-clamp-1 text-sm font-medium text-foreground"
            title={service.name}
          >
            {service.name}
          </div>
          {service.display_group && (
            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-border" />
              Part of group:{" "}
              <span className="font-semibold">{service.display_group}</span>
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <span className="inline-block size-1.5 rounded-full bg-border" />
            Department:{" "}
            <span className="font-semibold capitalize">
              {service.department_id ?? "Unassigned"}
            </span>
          </div>
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
        className="px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Complexity
        <ArrowUpDown className="ml-1 w-3 h-3" />
      </Button>
    ),
    cell: ({ row }) => {
      // Nullable in the DB — ServicesStatsCards counts these as "unclassified".
      const classification = row.getValue<string | null>("classification");
      if (!classification) {
        return (
          <Badge variant="neutral" className="font-semibold text-[10px]">
            Unclassified
          </Badge>
        );
      }
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
        className="px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Standard Fee
        <ArrowUpDown className="ml-1 w-3 h-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const fee = row.getValue<number>("fee");
      return (
        <span className="text-sm font-semibold text-foreground">
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
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Processing Time
      </span>
    ),
    cell: ({ row }) => (
      <span
        className="block max-w-[150px] truncate text-xs text-muted-foreground"
        title={row.getValue("processing_time")}
      >
        {row.getValue("processing_time") || "N/A"}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Actions
      </span>
    ),
    cell: ({ row, table }) => {
      const meta = table.options.meta as
        | {
            onView?: (service: Service) => void;
            onEdit?: (service: Service) => void;
          }
        | undefined;
      return (
        <div className="flex items-center gap-1.5">
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
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              meta?.onEdit?.(row.original);
            }}
            title="Edit Service"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      );
    },
  },
];
