import { useRef } from "react";
import { useHotkey, type HotkeyChord } from "@tanstack/react-hotkeys";
import { Building2, Search } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
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
    (filter) =>
      filter !== "unclassified" || classificationCounts.unclassified > 0,
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <InputGroup size="lg" className="min-w-56 max-w-md flex-1">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
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
        />
        {globalFilter ? null : (
          <InputGroupAddon align="inline-end">
            <Kbd aria-hidden="true">{hotkeyLabel(SEARCH_HOTKEY)}</Kbd>
          </InputGroupAddon>
        )}
      </InputGroup>

      <ToggleGroup
        aria-label="Filter by classification"
        value={[classificationFilter]}
        onValueChange={(values: string[]) => {
          // base-ui returns all currently active values — take the last selected
          const next = values[values.length - 1] as ClassificationFilter;
          if (next) onClassificationFilterChange(next);
        }}
        // lg height: a 1px border and 2px padding around 34px items make the
        // track 40px, level with the search box and the department select.
        className="min-h-10 flex-wrap rounded-md border border-border-strong bg-surface-subtle p-0.5"
      >
        {visibleFilters.map((filter) => (
          <ToggleGroupItem
            key={filter}
            value={filter}
            className="inline-flex h-8.5 items-center gap-2 rounded-sm px-3 text-sm font-medium text-muted-foreground data-pressed:bg-primary-soft data-pressed:text-primary data-pressed:ring-1 data-pressed:ring-inset data-pressed:ring-primary/15"
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
            className="w-48"
            aria-label="Filter by department"
            size="lg"
          >
            <SelectValue placeholder="All departments" className="capitalize" />
          </SelectTrigger>
          <SelectContent variant="roomy">
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
