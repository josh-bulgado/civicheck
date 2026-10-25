import { useCallback, useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  FilterChips,
  FilterSelect,
  TableSearch,
  type FilterChipOption,
} from "~/components/ui/data-table-toolbar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
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
const signInOptions: {
  value: AccountSignInFilter | typeof ALL;
  label: string;
}[] = [
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
  const [previousQuery, setPreviousQuery] = useState(filters.q);
  const [submittedQuery, setSubmittedQuery] = useState<
    string | undefined | null
  >(null);

  // Preserve newer typing when an earlier search response arrives.
  if (previousQuery !== filters.q) {
    setPreviousQuery(filters.q);
    if (filters.q !== submittedQuery) setSearch(filters.q ?? "");
  }

  const apply = useCallback(
    (next: AccountFilters) => {
      setSubmittedQuery(next.q);
      onFiltersChange(next);
    },
    [onFiltersChange],
  );

  useEffect(() => {
    const q = search.trim() || undefined;
    if (q === filters.q || q === submittedQuery) return;
    const timer = window.setTimeout(() => apply({ ...filters, q }), 350);
    return () => window.clearTimeout(timer);
  }, [search, filters, submittedQuery, apply]);

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
    apply({ ...filters, q: search.trim() || undefined, ...patch });
  }

  const isPersonnel = category === "personnel";
  const activeCount = [
    filters.role,
    filters.status,
    filters.departmentId,
    filters.signIn,
  ].filter(Boolean).length;
  const hasFilters = search || activeCount > 0;

  return (
    <div className="accounts-toolbar">
      <div className="accounts-categories">
        <FilterChips
          label="Account group"
          value={category}
          onValueChange={onCategoryChange}
          options={categoryOptions}
        />
      </div>
      <div className="accounts-toolbar-controls">
        <div className="accounts-search">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Search by name or email"
            label="Search accounts"
          />
        </div>
        {category !== "platform-admins" ? (
          <Popover>
            <PopoverTrigger
              nativeButton
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  shape="pill"
                  className="gap-2 border-border bg-card px-4 font-normal shadow-none"
                />
              }
            >
              <SlidersHorizontal aria-hidden="true" /> Filters
              {activeCount ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {activeCount}
                </span>
              ) : null}
            </PopoverTrigger>
            <PopoverContent
              align="end"
              aria-labelledby="accounts-filters-title"
              className="w-80 space-y-4 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p id="accounts-filters-title" className="text-sm font-medium">
                  Filter accounts
                </p>
                {hasFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      apply({});
                    }}
                  >
                    <X aria-hidden="true" /> Clear all
                  </Button>
                ) : null}
              </div>
              {isPersonnel ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="accounts-role-filter"
                    className="text-sm font-medium"
                  >
                    Role
                  </label>
                  <FilterSelect
                    id="accounts-role-filter"
                    label="Role"
                    className="w-full"
                    triggerClassName="w-full rounded-lg"
                    value={filters.role ?? ALL}
                    options={roleOptions}
                    onValueChange={(value) =>
                      update({
                        role:
                          value === ALL
                            ? undefined
                            : personnelRoles.find((role) => role === value),
                      })
                    }
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label
                  htmlFor="accounts-status-filter"
                  className="text-sm font-medium"
                >
                  Status
                </label>
                <FilterSelect
                  id="accounts-status-filter"
                  label="Status"
                  className="w-full"
                  triggerClassName="w-full rounded-lg"
                  value={filters.status ?? ALL}
                  options={statusOptions}
                  onValueChange={(value) =>
                    update({
                      status:
                        value === ALL
                          ? undefined
                          : (
                              Object.keys(
                                accountStatusLabels,
                              ) as AccountStatus[]
                            ).find((status) => status === value),
                    })
                  }
                />
              </div>
              {isPersonnel ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="accounts-department-filter"
                    className="text-sm font-medium"
                  >
                    Department
                  </label>
                  <FilterSelect
                    id="accounts-department-filter"
                    label="Department"
                    className="w-full"
                    triggerClassName="w-full rounded-lg"
                    value={filters.departmentId ?? ALL}
                    options={departmentOptions}
                    onValueChange={(value) =>
                      update({
                        departmentId: value === ALL ? undefined : value,
                      })
                    }
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label
                  htmlFor="accounts-sign-in-filter"
                  className="text-sm font-medium"
                >
                  Sign-in
                </label>
                <FilterSelect
                  id="accounts-sign-in-filter"
                  label="Sign-in"
                  className="w-full"
                  triggerClassName="w-full rounded-lg"
                  value={filters.signIn ?? ALL}
                  options={signInOptions}
                  onValueChange={(value) =>
                    update({
                      signIn:
                        value === "never" || value === "unverified"
                          ? value
                          : undefined,
                    })
                  }
                />
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}
