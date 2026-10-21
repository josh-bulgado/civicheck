import { CircleDot } from "lucide-react";
import {
  FilterChips,
  FilterSelect,
  TableSearch,
} from "~/components/ui/data-table-toolbar";
import {
  ROLE_FILTERS,
  ROLE_LABELS,
  STATUS_FILTERS,
  type RoleCounts,
  type RoleFilter,
  type StatusFilter,
} from "../staff-table.utils";

// Dot colors follow the role badges used elsewhere, so a chip looks like the
// rows it filters. "All" has no dot.
const ROLE_DOT: Record<Exclude<RoleFilter, "all">, string> = {
  admin: "bg-primary",
  supervisor: "bg-health-warning-dot",
  staff: "bg-health-success-dot",
  cashier: "bg-health-neutral-dot",
};

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "All",
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

const STATUS_OPTIONS = STATUS_FILTERS.map((status) => ({
  value: status,
  label: STATUS_LABEL[status],
}));

interface StaffTableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (value: RoleFilter) => void;
  /** Counts for every chip. They are the directory overview as well as the filter. */
  roleCounts: RoleCounts;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
}

export function StaffTableToolbar({
  globalFilter,
  onGlobalFilterChange,
  roleFilter,
  onRoleFilterChange,
  roleCounts,
  statusFilter,
  onStatusFilterChange,
}: StaffTableToolbarProps) {
  const chips = ROLE_FILTERS.map((filter) => ({
    value: filter,
    label: filter === "all" ? "All" : (ROLE_LABELS[filter] ?? filter),
    count: roleCounts[filter],
    dotClassName: filter === "all" ? undefined : ROLE_DOT[filter],
  }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <TableSearch
        value={globalFilter}
        onChange={onGlobalFilterChange}
        placeholder="Search by name, email or role…"
        label="Search staff"
      />

      <FilterChips
        label="Filter by role"
        value={roleFilter}
        onValueChange={onRoleFilterChange}
        options={chips}
      />

      <FilterSelect
        id="staff-status-filter"
        label="Status"
        icon={CircleDot}
        className="sm:ml-auto"
        triggerClassName="w-40"
        value={statusFilter}
        onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
        options={STATUS_OPTIONS}
      />
    </div>
  );
}
