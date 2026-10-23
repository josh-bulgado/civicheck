import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { Eye, Pencil } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { SortHeader } from "~/components/ui/data-table-column-header";
import { cn } from "~/lib/utils";
import { Service, ServiceClassification } from "../services.types";
import {
  matchesClassification,
  type ClassificationFilter,
} from "../services-table.utils";

/** Department filter value meaning "services with no department assigned". */
export const UNASSIGNED_DEPARTMENT_FILTER = "unassigned";

/** Department filter value meaning "no department filter". */
const ALL_DEPARTMENTS_FILTER = "all";

/** Shared by the department column filter and the classification chip counts. */
export function matchesDepartment(
  service: { department_id: string | null },
  filter: string,
): boolean {
  if (filter === ALL_DEPARTMENTS_FILTER) return true;
  return filter === UNASSIGNED_DEPARTMENT_FILTER
    ? service.department_id == null
    : service.department_id === filter;
}

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

const CLASSIFICATION_LABEL: Record<ServiceClassification, string> = {
  simple: "Simple",
  complex: "Complex",
  highly_technical: "Highly Technical",
};

export function ClassificationBadge({
  classification,
}: {
  classification: ServiceClassification | null;
}) {
  return (
    <Badge
      variant={classification ?? "unclassified"}
      className="h-[22px]"
    >
      {classification ? CLASSIFICATION_LABEL[classification] : "Unclassified"}
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

type ServicesTableMeta = {
  onView?: (service: ServiceDossier) => void;
};

export const columns: ColumnDef<ServiceDossier>[] = [
  {
    // Title and code share one column: the title is what people read, the code
    // is what staff search for, so it sits under the title instead of taking a
    // column of its own.
    accessorKey: "name",
    id: "name",
    header: ({ column }) => <SortHeader column={column}>Service</SortHeader>,
    cell: ({ row, table }) => {
      const service = row.original;
      const title = service.display_name ?? service.name;
      const meta = table.options.meta as ServicesTableMeta | undefined;
      return (
        // The title is the most important text in the row: one line, never cut
        // off, and it alone sets how wide this block is (w-fit), with at least
        // min-w-64 so a short title still leaves the codes some room. pr-6 keeps
        // a clear gap before the Department column. On a narrow window the table
        // scrolls sideways instead of wrapping or trimming the title.
        <div className="flex w-fit min-w-64 flex-col gap-0.5 pr-6">
          <button
            type="button"
            onClick={() => meta?.onView?.(service)}
            className="w-fit whitespace-nowrap rounded-sm text-left text-sm font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {title}
          </button>
          {/* w-0 min-w-full: this line is exactly as wide as the block above and
              truncates inside it, so a long list of variant codes can never
              widen the column or run up against the next one. */}
          <span className="flex w-0 min-w-full items-center gap-2 text-xs text-muted-foreground">
            {/* The stored service codes, as written: one for a single service,
                every variant's code for a group. Not humanized, because the
                title already reads naturally and the raw code is what appears
                in URLs, the database and audit logs. */}
            <span
              className="min-w-0 truncate font-mono"
              title={service.variant_codes.join(", ")}
            >
              {service.variant_codes.join(", ")}
            </span>
            {service.variant_count > 1 ? (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {service.variant_count} variants
              </Badge>
            ) : null}
          </span>
        </div>
      );
    },
  },
  {
    id: "department",
    accessorKey: "department_name",
    header: ({ column }) => <SortHeader column={column}>Department</SortHeader>,
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {row.original.department_name ?? "Unassigned"}
      </span>
    ),
    filterFn: (row, _columnId, filterValue: string) =>
      matchesDepartment(row.original, filterValue),
  },
  {
    accessorKey: "classification",
    header: ({ column }) => <SortHeader column={column}>Class</SortHeader>,
    // Nullable in the DB, so "unclassified" is a filter value of its own.
    filterFn: (row, _columnId, filterValue: ClassificationFilter) =>
      matchesClassification(row.original.classification, filterValue),
    cell: ({ row }) => (
      <ClassificationBadge classification={row.original.classification} />
    ),
  },
  {
    accessorKey: "fee",
    header: ({ column }) => (
      <SortHeader column={column} align="end">
        Fee
      </SortHeader>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono text-[13px] font-semibold tabular-nums text-foreground">
        {formatFeeRange(row.original.minimum_fee, row.original.maximum_fee)}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as ServicesTableMeta | undefined;
      const service = row.original;
      const editClassName = cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
      );
      return (
        // -mr-1.5 pulls the icon's visible edge flush with the table's right
        // inset (the button has padding around the glyph).
        <div className="-mr-1.5 flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              meta?.onView?.(service);
            }}
            aria-label={`View ${service.name}`}
            title="View Service Details"
          >
            <Eye aria-hidden="true" />
          </Button>
          {service.variant_count > 1 ? (
            <Link
              to="/admin/services/groups/$displayGroup"
              params={{ displayGroup: service.dossier_key }}
              search={{ scope: undefined }}
              onClick={(event) => event.stopPropagation()}
              className={editClassName}
              aria-label={`Manage ${service.name} group`}
              title="Manage Service Group"
            >
              <Pencil aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/admin/services/$serviceCode/edit"
              params={{ serviceCode: service.service_code }}
              onClick={(event) => event.stopPropagation()}
              className={editClassName}
              aria-label={`Edit ${service.name}`}
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
