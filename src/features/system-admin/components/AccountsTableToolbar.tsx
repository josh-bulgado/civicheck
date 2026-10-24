import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  FilterChips,
  FilterSelect,
  TableSearch,
  type FilterChipOption,
} from "~/components/ui/data-table-toolbar";
import type { AccountStatus, Role } from "~/lib/permissions";
import {
  accountCategories,
  accountCategoryLabels,
  accountStatusLabels,
  roleLabels,
} from "../system-admin.constants";
import type {
  AccountCategory,
  AccountFilters,
  AccountSignInFilter,
  SystemAdminDepartment,
} from "../system-admin.types";

const ALL = "all";
const SEARCH_DEBOUNCE_MS = 350;

const personnelRoles: Role[] = ["staff", "supervisor", "cashier", "admin"];

const categoryOptions: FilterChipOption<AccountCategory>[] =
  accountCategories.map((value) => ({
    value,
    label: accountCategoryLabels[value],
  }));

const roleOptions = [
  { value: ALL, label: "All roles" },
  ...personnelRoles.map((role) => ({ value: role, label: roleLabels[role] })),
];

const statusOptions = [
  { value: ALL, label: "All statuses" },
  ...(Object.keys(accountStatusLabels) as AccountStatus[]).map((status) => ({
    value: status,
    label: accountStatusLabels[status],
  })),
];

const signInOptions: { value: AccountSignInFilter | typeof ALL; label: string }[] =
  [
    { value: ALL, label: "Any sign-in" },
    { value: "never", label: "Never signed in" },
    { value: "unverified", label: "Email not verified" },
  ];

export function AccountsTableToolbar({
  category,
  filters,
  departments,
  onFiltersChange,
  onCategoryChange,
}: {
  category: AccountCategory;
  filters: AccountFilters;
  departments: SystemAdminDepartment[];
  onFiltersChange: (filters: AccountFilters) => void;
  onCategoryChange: (category: AccountCategory) => void;
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

  const departmentOptions = useMemo(
    () => [
      { value: ALL, label: "All departments" },
      ...departments.map((department) => ({
        value: department.id,
        label: department.name,
      })),
    ],
    [departments],
  );

  function update(patch: Partial<AccountFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  const isPersonnel = category === "personnel";
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email…"
          label="Search accounts"
        />
        <FilterChips
          label="Account group"
          value={category}
          onValueChange={onCategoryChange}
          options={categoryOptions}
        />
      </div>

      {category === "platform-admins" ? null : (
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {isPersonnel ? (
            <FilterSelect
              id="accounts-role-filter"
              label="Role"
              value={filters.role ?? ALL}
              options={roleOptions}
              onValueChange={(value) =>
                update({ role: value === ALL ? undefined : (value as Role) })
              }
            />
          ) : null}
          <FilterSelect
            id="accounts-status-filter"
            label="Status"
            value={filters.status ?? ALL}
            options={statusOptions}
            onValueChange={(value) =>
              update({
                status: value === ALL ? undefined : (value as AccountStatus),
              })
            }
          />
          {isPersonnel ? (
            <FilterSelect
              id="accounts-department-filter"
              label="Department"
              value={filters.departmentId ?? ALL}
              options={departmentOptions}
              onValueChange={(value) =>
                update({ departmentId: value === ALL ? undefined : value })
              }
            />
          ) : null}
          <FilterSelect
            id="accounts-sign-in-filter"
            label="Sign-in"
            value={filters.signIn ?? ALL}
            options={signInOptions}
            onValueChange={(value) =>
              update({
                signIn: value === ALL ? undefined : (value as AccountSignInFilter),
              })
            }
          />
          {hasFilters ? (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => onFiltersChange({})}
            >
              <RotateCcw aria-hidden="true" data-icon="inline-start" />
              Clear Filters
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
