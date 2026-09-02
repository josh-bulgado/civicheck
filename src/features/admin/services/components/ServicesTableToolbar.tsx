import { Building2, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Department } from "~/features/admin/departments.queries";
import { UNASSIGNED_DEPARTMENT_FILTER } from "./ServicesColumn";

const CLASSIFICATION_FILTERS = [
  "all",
  "simple",
  "complex",
  "highly_technical",
] as const;
export type ClassificationFilter = (typeof CLASSIFICATION_FILTERS)[number];

// Same severity colors as the Classification badge in the table itself
// (see badgeVariants' simple/complex/highly_technical) — the filter should
// look like it belongs to the data it's filtering, not a neutral gray set.
const CLASSIFICATION_DOT: Record<
  Exclude<ClassificationFilter, "all">,
  string
> = {
  simple: "bg-success",
  complex: "bg-warning",
  highly_technical: "bg-destructive",
};

export const ALL_DEPARTMENTS = "all";

interface ServicesTableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  classificationFilter: ClassificationFilter;
  onClassificationFilterChange: (value: ClassificationFilter) => void;
  departments: Department[];
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
}

export function ServicesTableToolbar({
  globalFilter,
  onGlobalFilterChange,
  classificationFilter,
  onClassificationFilterChange,
  departments,
  departmentFilter,
  onDepartmentFilterChange,
}: ServicesTableToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by service name or code..."
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="h-10 rounded-lg border-border pl-10 text-sm focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Department:</span>
          </div>
          <Select
            value={departmentFilter}
            onValueChange={(value) =>
              onDepartmentFilterChange(value ?? ALL_DEPARTMENTS)
            }
          >
            <SelectTrigger
              id="services-department-filter"
              className="h-10 w-48"
              aria-label="Filter by department"
            >
              <SelectValue
                placeholder="All departments"
                className="capitalize"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
                <SelectItem value={UNASSIGNED_DEPARTMENT_FILTER}>
                  Unassigned
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Classification:</span>
        </div>
        <ToggleGroup
          value={[classificationFilter]}
          onValueChange={(values: string[]) => {
            // base-ui returns all currently active values — take the last selected
            const next = values[values.length - 1] as ClassificationFilter;
            if (next) onClassificationFilterChange(next);
          }}
          className="rounded-lg border border-border-strong bg-surface-subtle p-0.5"
        >
          {CLASSIFICATION_FILTERS.map((cls) => (
            <ToggleGroupItem
              key={cls}
              value={cls}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=on]:bg-primary-soft data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/15"
            >
              {cls !== "all" && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    CLASSIFICATION_DOT[cls],
                  )}
                />
              )}
              {cls === "all"
                ? "All"
                : cls
                    .replace("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
