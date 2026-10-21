import { useRef } from "react";
import { useHotkey, type HotkeyChord } from "@tanstack/react-hotkeys";
import { CircleDot, Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Kbd } from "~/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { cn } from "~/lib/utils";
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

/** Jumps to the search box; plain keys are ignored while a field has focus. */
const SEARCH_HOTKEY: HotkeyChord = "/";

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
  const searchRef = useRef<HTMLInputElement>(null);
  const hotkeyLabel = useHotkeyLabel();
  useHotkey(SEARCH_HOTKEY, () => searchRef.current?.focus());

  return (
    <div className="flex flex-wrap items-center gap-3">
      <InputGroup size="lg" className="min-w-56 max-w-md flex-1">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchRef}
          placeholder="Search by name, email or role..."
          aria-label="Search staff"
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
        aria-label="Filter by role"
        value={[roleFilter]}
        onValueChange={(values: string[]) => {
          // base-ui returns all currently active values — take the last selected
          const next = values[values.length - 1] as RoleFilter | undefined;
          if (next) onRoleFilterChange(next);
        }}
        variant="pill"
        size="lg"
        className="flex-wrap"
      >
        {ROLE_FILTERS.map((filter) => (
          <ToggleGroupItem key={filter} value={filter}>
            {filter !== "all" && (
              <span
                aria-hidden="true"
                className={cn("size-1.5 shrink-0 rounded-full", ROLE_DOT[filter])}
              />
            )}
            {filter === "all" ? "All" : ROLE_LABELS[filter]}
            <span className="tabular-nums opacity-70">
              {roleCounts[filter]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex items-center gap-2 sm:ml-auto">
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <CircleDot aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">Status:</span>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange((value ?? "all") as StatusFilter)
          }
        >
          <SelectTrigger
            id="staff-status-filter"
            className="w-40"
            aria-label="Filter by status"
            size="lg"
          >
            <SelectValue placeholder="All" className="capitalize" />
          </SelectTrigger>
          <SelectContent variant="roomy">
            <SelectGroup>
              {STATUS_FILTERS.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
