import { useEffect, useRef, useState } from "react";
import { RotateCcw, Search, UserRoundCog } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { RealtimeStatus } from "~/hooks/useRealtimeRefresh";
import type { AccountStatus, Role } from "~/lib/permissions";
import { roleLabels } from "../system-admin.constants";
import type {
  AccountCategory,
  AccountFilters,
  SystemAdminDepartment,
} from "../system-admin.types";
import { RealtimeStatusBadge } from "./RealtimeStatusBadge";

const ALL = "all";
const SEARCH_DEBOUNCE_MS = 350;

const personnelRoles: Role[] = ["staff", "supervisor", "cashier", "admin"];

const statusOptions: { value: AccountStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deactivated", label: "Deactivated" },
];

type FilterOption = { value: string; label: string };

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as string)}
    >
      <SelectTrigger aria-label={label} className="w-full sm:w-44">
        <SelectValue>
          {(current) =>
            options.find((option) => option.value === current)?.label
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function AccountsTableToolbar({
  category,
  filters,
  departments,
  onFiltersChange,
  placeholder,
  realtimeStatus,
  onReplaceAdministrator,
  replaceAdministratorLabel = "Replace CCRO Administrator",
}: {
  category: AccountCategory;
  filters: AccountFilters;
  departments: SystemAdminDepartment[];
  onFiltersChange: (filters: AccountFilters) => void;
  placeholder: string;
  realtimeStatus: RealtimeStatus;
  onReplaceAdministrator?: () => void;
  replaceAdministratorLabel?: string;
}) {
  const [search, setSearch] = useState(filters.q ?? "");
  const latest = useRef({ filters, onFiltersChange });
  latest.current = { filters, onFiltersChange };
  // The last query this toolbar pushed into the URL. A URL value different
  // from it came from elsewhere (back/forward, "Clear filters").
  const submittedQuery = useRef(filters.q);

  // Typing is debounced into the URL so each keystroke is not a server round
  // trip; the other filters are discrete and apply immediately.
  useEffect(() => {
    const next = search.trim() || undefined;
    if (next === latest.current.filters.q) return;
    const timer = setTimeout(() => {
      submittedQuery.current = next;
      latest.current.onFiltersChange({ ...latest.current.filters, q: next });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (filters.q === submittedQuery.current) return;
    submittedQuery.current = filters.q;
    setSearch(filters.q ?? "");
  }, [filters.q]);

  function update(patch: Partial<AccountFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  const isPersonnel = category === "personnel";
  const hasFilters = Boolean(
    filters.q ||
      filters.role ||
      filters.status ||
      filters.departmentId ||
      filters.signIn,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-3 sm:max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search accounts by name or email"
              className="h-10 rounded-lg pl-10 text-sm"
            />
          </div>
          <RealtimeStatusBadge status={realtimeStatus} />
        </div>
        {onReplaceAdministrator ? (
          <Button onClick={onReplaceAdministrator} className="sm:shrink-0">
            <UserRoundCog />
            {replaceAdministratorLabel}
          </Button>
        ) : null}
      </div>

      {category === "platform-admins" ? null : (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {isPersonnel ? (
            <FilterSelect
              label="Filter by role"
              value={filters.role ?? ALL}
              options={[
                { value: ALL, label: "All roles" },
                ...personnelRoles.map((role) => ({
                  value: role,
                  label: roleLabels[role],
                })),
              ]}
              onChange={(value) =>
                update({ role: value === ALL ? undefined : (value as Role) })
              }
            />
          ) : null}
          <FilterSelect
            label="Filter by status"
            value={filters.status ?? ALL}
            options={[{ value: ALL, label: "All statuses" }, ...statusOptions]}
            onChange={(value) =>
              update({
                status: value === ALL ? undefined : (value as AccountStatus),
              })
            }
          />
          {isPersonnel ? (
            <FilterSelect
              label="Filter by department"
              value={filters.departmentId ?? ALL}
              options={[
                { value: ALL, label: "All departments" },
                ...departments.map((department) => ({
                  value: department.id,
                  label: department.name,
                })),
              ]}
              onChange={(value) =>
                update({ departmentId: value === ALL ? undefined : value })
              }
            />
          ) : null}
          <FilterSelect
            label="Filter by sign-in"
            value={filters.signIn ?? ALL}
            options={[
              { value: ALL, label: "Any sign-in" },
              { value: "never", label: "Never signed in" },
            ]}
            onChange={(value) =>
              update({ signIn: value === "never" ? "never" : undefined })
            }
          />
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({})}
            >
              <RotateCcw />
              Clear filters
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
