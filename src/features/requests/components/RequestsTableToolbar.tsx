import type { ReactNode } from "react";
import { FilterX, ListFilter } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  FilterChips,
  FilterSelect,
  TableSearch,
} from "~/components/ui/data-table-toolbar";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Toggle } from "~/components/ui/toggle";
import { ALL_DEPARTMENTS, departmentFilterOptions } from "~/features/admin/department-filter";
import type { Department } from "~/features/admin/departments.queries";
import { useIsMobile } from "~/hooks/use-mobile";
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
} from "../request-workflow";
import type { StageCounts } from "../requests-table.utils";
import { STAGE_TONES } from "../stage-tones";

const ALL = "all";

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
  { value: "verified", label: "Paid" },
];

const WORK_OPTIONS = [
  { value: ALL, label: "All work" },
  { value: "mine", label: "My work" },
  { value: "staff", label: "Waiting on staff" },
];

interface FilterSelectFieldProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}

function FilterSelectField({
  id,
  label,
  value,
  onValueChange,
  options,
}: FilterSelectFieldProps) {
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FilterSelect
        id={id}
        label={label}
        value={value}
        onValueChange={onValueChange}
        options={options}
        triggerClassName="w-full"
      />
    </Field>
  );
}

interface RequestFilterFieldsProps {
  filters: RequestQueueFilters;
  onFilterChange: (patch: Partial<RequestQueueFilters>) => void;
  departments: Department[];
  showDepartment: boolean;
  hasActiveFilters: boolean;
  onClear: () => void;
}

function RequestFilterFields({
  filters,
  onFilterChange,
  departments,
  showDepartment,
  hasActiveFilters,
  onClear,
}: RequestFilterFieldsProps) {
  return (
    <FieldGroup className="gap-4">
      <FilterSelectField
        id="requests-work-filter"
        label="Work"
        value={filters.mine ? "mine" : filters.needs ? "staff" : ALL}
        onValueChange={(value) =>
          onFilterChange({
            needs: value === "staff" ? true : undefined,
            mine: value === "mine" ? true : undefined,
            attention: undefined,
          })
        }
        options={WORK_OPTIONS}
      />
      <FilterSelectField
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
      <FilterSelectField
        id="requests-payment-filter"
        label="Payment"
        value={filters.payment ?? ALL}
        onValueChange={(value) =>
          onFilterChange({
            payment:
              value === "unpaid" || value === "verified" ? value : undefined,
          })
        }
        options={PAYMENT_OPTIONS}
      />
      {showDepartment ? (
        <FilterSelectField
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
      ) : null}
      {hasActiveFilters ? (
        <Button variant="ghost" size="lg" onClick={onClear} className="justify-start">
          <FilterX aria-hidden="true" data-icon="inline-start" />
          Clear all filters
        </Button>
      ) : null}
    </FieldGroup>
  );
}

interface RequestFiltersControlProps extends RequestFilterFieldsProps {
  activeCount: number;
}

function RequestFiltersControl({
  activeCount,
  ...fieldProps
}: RequestFiltersControlProps) {
  const isMobile = useIsMobile();
  const trigger = (
    <Button
      variant={activeCount > 0 ? "secondary" : "outline"}
      size="lg"
    />
  );
  const triggerContent = (
    <>
      <ListFilter aria-hidden="true" data-icon="inline-start" />
      Filters
      {activeCount > 0 ? (
        <Badge variant="neutral" className="min-w-5 px-1.5 tabular-nums">
          {activeCount}
        </Badge>
      ) : null}
    </>
  );
  const fields = <RequestFilterFields {...fieldProps} />;

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger render={trigger}>{triggerContent}</SheetTrigger>
        <SheetContent side="right" className="w-[min(22rem,calc(100%-1rem))]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Narrow the request queue. Changes apply immediately.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{fields}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger render={trigger}>{triggerContent}</PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="mb-4 flex flex-col gap-1">
          <p className="font-medium text-foreground">Filters</p>
          <p className="text-sm text-muted-foreground">
            Narrow the request queue. Changes apply immediately.
          </p>
        </div>
        {fields}
      </PopoverContent>
    </Popover>
  );
}

interface RequestsTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: RequestQueueFilters;
  onFilterChange: (patch: Partial<RequestQueueFilters>) => void;
  /** Counts for every stage chip. They are the queue overview as well as the filter. */
  stageCounts: StageCounts;
  /** How many overdue staff waits the other filters leave. */
  attentionCount: number;
  departments: Department[];
  /** Staff and supervisors only ever see one department: show it, not a picker. */
  scopedDepartmentName?: string | null;
  hasActiveFilters: boolean;
  onClear: () => void;
  actions?: ReactNode;
}

export function RequestsTableToolbar({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  stageCounts,
  attentionCount,
  departments,
  scopedDepartmentName,
  hasActiveFilters,
  onClear,
  actions,
}: RequestsTableToolbarProps) {
  const stageChips = [
    { value: ALL, label: "All", count: stageCounts.all },
    ...STAGES.map((stage) => ({
      value: String(stage),
      label: STAGE_LABELS[stage],
      count: stageCounts[stage],
      dotClassName: STAGE_TONES[stage].dot,
    })),
  ];
  const secondaryFilterCount = [
    filters.needs,
    filters.mine,
    filters.status,
    filters.payment,
    scopedDepartmentName ? undefined : filters.department,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-3 2xl:flex-nowrap">
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

      {/* Urgency combines with any stage, so it is a toggle rather than a chip. */}
      <Toggle
        size="lg"
        pressed={filters.attention === true}
        onPressedChange={(pressed) =>
          onFilterChange({
            attention: pressed ? true : undefined,
            needs: undefined,
            mine: undefined,
          })
        }
        className="shrink-0 rounded-full border border-border-strong px-3.5 font-semibold text-body-2 aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
      >
        Needs attention
        <span className="tabular-nums opacity-70">{attentionCount}</span>
      </Toggle>

      <div className="flex shrink-0 items-center gap-2 2xl:ml-auto">
        <RequestFiltersControl
          activeCount={secondaryFilterCount}
          filters={filters}
          onFilterChange={onFilterChange}
          departments={departments}
          showDepartment={!scopedDepartmentName}
          hasActiveFilters={hasActiveFilters}
          onClear={onClear}
        />
        {actions}
      </div>
    </div>
  );
}
