import { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, Eye, Pencil } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { Service, ServiceClassification } from "../services.types";

/** Department filter value meaning "services with no department assigned". */
export const UNASSIGNED_DEPARTMENT_FILTER = "unassigned";

export interface ServiceDossierVariant {
  service_code: string;
  fee: number;
  classification: ServiceClassification | null;
}

export interface ServiceDossier extends Service {
  dossier_key: string;
  variant_count: number;
  variant_codes: string[];
  variants: ServiceDossierVariant[];
  minimum_fee: number;
  maximum_fee: number;
  processing_varies: boolean;
}

export function formatFee(amount: number): string {
  return amount === 0
    ? "Free"
    : `₱${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
}

export function formatFeeRange(minimumFee: number, maximumFee: number): string {
  return minimumFee === maximumFee
    ? formatFee(minimumFee)
    : `${formatFee(minimumFee)}–${formatFee(maximumFee)}`;
}

export function ClassificationBadge({
  classification,
}: {
  classification: ServiceClassification | null;
}) {
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
      variants: ordered.map((variant) => ({
        service_code: variant.service_code,
        fee: Number(variant.fee),
        classification: variant.classification,
      })),
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
          <HoverCard>
            <HoverCardTrigger
              render={
                <Badge
                  variant="secondary"
                  className="w-fit cursor-default text-[10px]"
                >
                  {row.original.variant_count} internal variants
                </Badge>
              }
            />
            <HoverCardContent className="w-auto min-w-56 p-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Internal variants
              </p>
              <ul className="flex flex-col gap-1.5">
                {row.original.variants.map((variant) => (
                  <li
                    key={variant.service_code}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="font-mono text-xs font-medium text-foreground">
                      {variant.service_code}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        {formatFee(variant.fee)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </HoverCardContent>
          </HoverCard>
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
      const title = service.display_name ?? service.name;
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="max-w-[220px] truncate text-sm font-medium text-foreground">
                {title}
              </div>
            }
          />
          <TooltipContent>{title}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    id: "department",
    accessorKey: "department_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Department
        <ArrowUpDown aria-hidden="true" data-icon="inline-end" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {row.original.department_name ?? "Unassigned"}
      </span>
    ),
    filterFn: (row, _columnId, filterValue: string) =>
      filterValue === UNASSIGNED_DEPARTMENT_FILTER
        ? row.original.department_id == null
        : row.original.department_id === filterValue,
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
    cell: ({ row }) => (
      // Nullable in the DB — ServicesStatsCards counts these as "unclassified".
      <ClassificationBadge classification={row.original.classification} />
    ),
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
    cell: ({ row }) => (
      <span className="text-sm font-semibold text-foreground">
        {formatFeeRange(row.original.minimum_fee, row.original.maximum_fee)}
      </span>
    ),
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
