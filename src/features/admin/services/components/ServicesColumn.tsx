import { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, Eye, Pencil } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Service } from "../services.types";

export interface ServiceDossier extends Service {
  dossier_key: string;
  variant_count: number;
  variant_codes: string[];
  minimum_fee: number;
  maximum_fee: number;
  processing_varies: boolean;
}

export function buildServiceDossiers(services: Service[]): ServiceDossier[] {
  const groups = new Map<string, Service[]>();
  for (const service of services) {
    const key = service.display_group ?? service.service_code;
    const group = groups.get(key);
    if (group) group.push(service);
    else groups.set(key, [service]);
  }

  return [...groups.entries()].map(([dossierKey, variants]) => {
    const ordered = [...variants].sort((left, right) =>
      left.service_code.localeCompare(right.service_code),
    );
    const representative = ordered[0];
    const fees = ordered.map((variant) => Number(variant.fee));
    return {
      ...representative,
      name: representative.display_name ?? representative.name,
      dossier_key: dossierKey,
      variant_count: ordered.length,
      variant_codes: ordered.map((variant) => variant.service_code),
      minimum_fee: Math.min(...fees),
      maximum_fee: Math.max(...fees),
      processing_varies:
        new Set(ordered.map((variant) => variant.processing_time)).size > 1,
    };
  });
}

export const columns: ColumnDef<ServiceDossier>[] = [
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
        <ArrowUpDown aria-hidden="true" data-icon="inline-end" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs font-bold uppercase text-foreground">
          {row.original.dossier_key}
        </span>
        {row.original.variant_count > 1 ? (
          <Badge variant="secondary" className="w-fit text-[10px]">
            {row.original.variant_count} internal variants
          </Badge>
        ) : null}
      </div>
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
        <ArrowUpDown aria-hidden="true" data-icon="inline-end" />
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
            {service.display_name ?? service.name}
          </div>
          {service.display_group && (
            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-border" />
              Part of group:{" "}
              <span className="font-semibold uppercase">
                {service.display_group}
              </span>
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
        <ArrowUpDown aria-hidden="true" data-icon="inline-end" />
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
      const minimumFee = row.original.minimum_fee;
      const maximumFee = row.original.maximum_fee;
      const formatAmount = (amount: number) =>
        amount === 0
          ? "Free"
          : `₱${amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
      return (
        <span className="text-sm font-semibold text-foreground">
          {minimumFee === maximumFee
            ? formatAmount(minimumFee)
            : `${formatAmount(minimumFee)}–${formatAmount(maximumFee)}`}
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
        title={
          row.original.processing_varies
            ? "Processing time varies by internal case"
            : row.original.processing_time
        }
      >
        {row.original.processing_varies
          ? "Varies by case"
          : row.original.processing_time || "N/A"}
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
            onView?: (service: ServiceDossier) => void;
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
            aria-label={`View ${row.original.name}`}
            title="View Service Details"
          >
            <Eye aria-hidden="true" />
          </Button>
          {row.original.variant_count > 1 ? (
            <Link
              to="/admin/services/groups/$displayGroup"
              params={{ displayGroup: row.original.dossier_key }}
              search={{ scope: undefined }}
              onClick={(event) => event.stopPropagation()}
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
              )}
              aria-label={`Manage ${row.original.name} group`}
              title="Manage Service Group"
            >
              <Pencil aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/admin/services/$serviceCode/edit"
              params={{ serviceCode: row.original.service_code }}
              onClick={(event) => event.stopPropagation()}
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
              )}
              aria-label={`Edit ${row.original.name}`}
              title="Edit Service"
            >
              <Pencil aria-hidden="true" />
            </Link>
          )}
        </div>
      );
    },
  },
];
