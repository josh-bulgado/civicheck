import { useRef } from "react";
import { useHotkey, type HotkeyChord } from "@tanstack/react-hotkeys";
import { Building2, Search } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kbd";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
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

export const ALL_DEPARTMENTS = "all";

/** Jumps to the search box; plain keys are ignored while a field has focus. */
const SEARCH_HOTKEY: HotkeyChord = "/";

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
  const searchRef = useRef<HTMLInputElement>(null);
  const hotkeyLabel = useHotkeyLabel();
  useHotkey(SEARCH_HOTKEY, () => searchRef.current?.focus());

  // "Unclassified" only earns a chip when something is actually unclassified.
  const visibleFilters = CLASSIFICATION_FILTERS.filter(
    (filter) => filter !== "unclassified" || classificationCounts.unclassified > 0,
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 max-w-md flex-1">
        <Search
          aria-hidden="true"
          className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={searchRef}
          placeholder="Search by service name or code..."
          aria-label="Search services"
          aria-keyshortcuts="/"
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          // Escape clears a search, and leaves the box once it is empty.
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            if (globalFilter) onGlobalFilterChange("");
            else e.currentTarget.blur();
          }}
          className="h-10 rounded-lg border-border pr-10 pl-10 text-sm focus-visible:border-primary focus-visible:ring-primary"
        />
        {globalFilter ? null : (
          <Kbd
            aria-hidden="true"
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {hotkeyLabel(SEARCH_HOTKEY)}
          </Kbd>
        )}
      </div>

      <ToggleGroup
        aria-label="Filter by classification"
        value={[classificationFilter]}
        onValueChange={(values: string[]) => {
          // base-ui returns all currently active values — take the last selected
          const next = values[values.length - 1] as ClassificationFilter;
          if (next) onClassificationFilterChange(next);
        }}
        className="flex-wrap rounded-lg border border-border-strong bg-surface-subtle p-0.5"
      >
        {visibleFilters.map((filter) => (
          <ToggleGroupItem
            key={filter}
            value={filter}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground data-pressed:bg-primary-soft data-pressed:text-primary data-pressed:ring-1 data-pressed:ring-inset data-pressed:ring-primary/15"
          >
            {filter !== "all" && (
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  CLASSIFICATION_DOT[filter],
                )}
              />
            )}
            {CLASSIFICATION_LABEL[filter]}
            <span className="tabular-nums opacity-70">
              {classificationCounts[filter]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex items-center gap-2 sm:ml-auto">
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Building2 aria-hidden="true" className="size-3.5" />
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
  );
}
