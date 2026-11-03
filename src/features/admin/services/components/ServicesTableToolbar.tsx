import { Building2 } from "lucide-react";
import {
  FilterChips,
  FilterSelect,
  TableSearch,
} from "~/components/ui/data-table-toolbar";
import type { Department } from "~/features/admin/departments.queries";
import { departmentFilterOptions } from "~/features/admin/department-filter";
import {
  CLASSIFICATION_FILTERS,
  type ClassificationCounts,
  type ClassificationFilter,
} from "../services-table.utils";
import { UNASSIGNED_DEPARTMENT_FILTER } from "./ServicesColumn";

// Same dot colors as the Classification badge in the table itself
// (see badgeVariants' simple/complex/highly_technical) — the filter should
// look like it belongs to the data it's filtering, not a neutral gray set.
const CLASSIFICATION_DOT: Record<
  Exclude<ClassificationFilter, "all">,
  string
> = {
  simple: "bg-health-success-dot",
  complex: "bg-health-warning-dot",
  highly_technical: "bg-health-error-dot",
  unclassified: "bg-health-neutral-dot",
};

const CLASSIFICATION_LABEL: Record<ClassificationFilter, string> = {
  all: "All",
  simple: "Simple",
  complex: "Complex",
  highly_technical: "Highly Technical",
  unclassified: "Unclassified",
};

interface ServicesTableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  classificationFilter: ClassificationFilter;
  onClassificationFilterChange: (value: ClassificationFilter) => void;
  /** Counts for every chip. They are the registry overview as well as the filter. */
  classificationCounts: ClassificationCounts;
  departments: Department[];
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
}

export function ServicesTableToolbar({
  globalFilter,
  onGlobalFilterChange,
  classificationFilter,
  onClassificationFilterChange,
  classificationCounts,
  departments,
  departmentFilter,
  onDepartmentFilterChange,
}: ServicesTableToolbarProps) {
  // "Unclassified" only earns a chip when something is actually unclassified.
  const chips = CLASSIFICATION_FILTERS.filter(
    (filter) =>
      filter !== "unclassified" || classificationCounts.unclassified > 0,
  ).map((filter) => ({
    value: filter,
    label: CLASSIFICATION_LABEL[filter],
    count: classificationCounts[filter],
    dotClassName: filter === "all" ? undefined : CLASSIFICATION_DOT[filter],
  }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <TableSearch
        value={globalFilter}
        onChange={onGlobalFilterChange}
        placeholder="Search by service name or code…"
        label="Search services"
      />

      <FilterChips
        label="Filter by classification"
        value={classificationFilter}
        onValueChange={onClassificationFilterChange}
        options={chips}
      />

      <FilterSelect
        id="services-department-filter"
        label="Department"
        icon={Building2}
        className="sm:ml-auto"
        value={departmentFilter}
        onValueChange={onDepartmentFilterChange}
        options={departmentFilterOptions(
          departments,
          UNASSIGNED_DEPARTMENT_FILTER,
        )}
      />
    </div>
  );
}
