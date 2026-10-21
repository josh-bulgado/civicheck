import { Building2, FilterX } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  FilterChips,
  FilterSelect,
  TableSearch,
} from "~/components/ui/data-table-toolbar";
import { Toggle } from "~/components/ui/toggle";
import { ALL_DEPARTMENTS, departmentFilterOptions } from "~/features/admin/department-filter";
import type { Department } from "~/features/admin/departments.queries";
import {
  STAGES,
  UNASSIGNED_DEPARTMENT_FILTER,
  parseRequestStatus,
  parseWorkflowStage,
  type PaymentFilter,
  type RequestQueueFilters,
} from "../request-queue";
import {
  REQUEST_STATUSES,
  STAGE_LABELS,
  getStatusDetails,
  type WorkflowStage,
} from "../request-workflow";
import type { StageCounts } from "../requests-table.utils";

const ALL = "all";

// The stage dots carry the colours of the statuses inside each stage.
const STAGE_DOT: Record<WorkflowStage, string> = {
  1: "bg-health-warning-dot",
  2: "bg-health-info-dot",
  3: "bg-tone-progress",
  4: "bg-health-success-dot",
};

const STATUS_OPTIONS = [
  { value: ALL, label: "All statuses" },
  ...REQUEST_STATUSES.map((status) => ({
    value: status,
    label: getStatusDetails(status).label,
  })),
];

const PAYMENT_OPTIONS: Array<{ value: PaymentFilter | typeof ALL; label: string }> = [
  { value: ALL, label: "All payments" },
  { value: "unpaid", label: "Unpaid" },
  { value: "verified", label: "Verified" },
];

interface RequestsTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: RequestQueueFilters;
  onFilterChange: (patch: Partial<RequestQueueFilters>) => void;
  /** Counts for every stage chip. They are the queue overview as well as the filter. */
  stageCounts: StageCounts;
  /** How many requests waiting on staff the other filters leave. */
  needsCount: number;
  departments: Department[];
  /** Staff and supervisors only ever see one department: show it, not a picker. */
  scopedDepartmentName?: string | null;
  hasActiveFilters: boolean;
  onClear: () => void;
}

export function RequestsTableToolbar({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  stageCounts,
  needsCount,
  departments,
  scopedDepartmentName,
  hasActiveFilters,
  onClear,
}: RequestsTableToolbarProps) {
  const stageChips = [
    { value: ALL, label: "All", count: stageCounts.all },
    ...STAGES.map((stage) => ({
      value: String(stage),
      label: STAGE_LABELS[stage],
      count: stageCounts[stage],
      dotClassName: STAGE_DOT[stage],
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <TableSearch
        value={search}
        onChange={onSearchChange}
        placeholder="Search by tracking number, applicant or service…"
        label="Search requests"
      />

      <FilterChips
        label="Filter by stage"
        value={filters.stage ? String(filters.stage) : ALL}
        onValueChange={(value) =>
          onFilterChange({
            stage: value === ALL ? undefined : parseWorkflowStage(Number(value)),
          })
        }
        options={stageChips}
      />

      {/* Combines with any stage, so it is a toggle rather than another chip. */}
      <Toggle
        size="lg"
        pressed={filters.needs === true}
        onPressedChange={(pressed) =>
          onFilterChange({ needs: pressed ? true : undefined })
        }
        className="rounded-full border border-border-strong px-3.5 font-semibold text-body-2 aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
      >
        Needs You
        <span className="tabular-nums opacity-70">{needsCount}</span>
      </Toggle>

      <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
        <FilterSelect
          id="requests-status-filter"
          label="Status"
          value={filters.status ?? ALL}
          onValueChange={(value) =>
            onFilterChange({
              status: value === ALL ? undefined : parseRequestStatus(value),
            })
          }
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          id="requests-payment-filter"
          label="Payment"
          triggerClassName="w-44"
          value={filters.payment ?? ALL}
          onValueChange={(value) =>
            onFilterChange({
              payment: value === "unpaid" || value === "verified" ? value : undefined,
            })
          }
          options={PAYMENT_OPTIONS}
        />
        {scopedDepartmentName ? (
          <Badge variant="neutral" className="h-10 gap-1.5 px-3 text-sm font-semibold">
            <Building2 aria-hidden="true" className="size-3.5" />
            {scopedDepartmentName}
          </Badge>
        ) : (
          <FilterSelect
            id="requests-department-filter"
            label="Department"
            value={filters.department ?? ALL_DEPARTMENTS}
            onValueChange={(value) =>
              onFilterChange({
                department: value === ALL_DEPARTMENTS ? undefined : value,
              })
            }
            options={departmentFilterOptions(
              departments,
              UNASSIGNED_DEPARTMENT_FILTER,
            )}
          />
        )}
        {hasActiveFilters ? (
          <Button variant="ghost" size="lg" onClick={onClear}>
            <FilterX aria-hidden="true" data-icon="inline-start" />
            Clear Filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
