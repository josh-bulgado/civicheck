import { useCallback, useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Tag, UserRound, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { FilterSelect, TableSearch } from "~/components/ui/data-table-toolbar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { AccountStatus, Role } from "~/lib/permissions";
import { accountStatusLabels, roleLabels } from "../system-admin.constants";
import type {
  AccountCategory,
  AccountFilters,
  AccountSignInFilter,
  SystemAdminDepartment,
} from "../system-admin.types";

const ALL = "all";
const personnelRoles: Role[] = ["staff", "supervisor", "cashier", "admin"];
const roleOptions = [
  { value: ALL, label: "Role" },
  ...personnelRoles.map((role) => ({ value: role, label: roleLabels[role] })),
];
const statusOptions = [
  { value: ALL, label: "Status" },
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
}: {
  category: AccountCategory;
  filters: AccountFilters;
  departments: SystemAdminDepartment[];
  onFiltersChange: (filters: AccountFilters) => void;
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
  const activeCount = [filters.departmentId, filters.signIn].filter(
    Boolean,
  ).length;
  const hasFilters =
    search || filters.role || filters.status || activeCount > 0;

  return (
    <div className="accounts-toolbar center-table-toolbar">
      <div className="accounts-search">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email"
          label="Search accounts"
        />
      </div>
      {isPersonnel ? (
        <div className="accounts-filter-field">
          <UserRound aria-hidden="true" />
          <FilterSelect
            id="accounts-role-filter"
            label="Role"
            value={filters.role ?? ALL}
            options={roleOptions}
            triggerClassName="w-auto"
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
      {category !== "platform-admins" ? (
        <div className="accounts-filter-field">
          <Tag aria-hidden="true" />
          <FilterSelect
            id="accounts-status-filter"
            label="Status"
            value={filters.status ?? ALL}
            options={statusOptions}
            triggerClassName="w-auto"
            onValueChange={(value) =>
              update({
                status:
                  value === ALL
                    ? undefined
                    : (
                        Object.keys(accountStatusLabels) as AccountStatus[]
                      ).find((status) => status === value),
              })
            }
          />
        </div>
      ) : null}
      {category !== "platform-admins" ? (
        <Popover>
          <PopoverTrigger
            nativeButton
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                shape="pill"
                className="relative border-border bg-card shadow-none"
                aria-label="More account filters"
              />
            }
          >
            <SlidersHorizontal aria-hidden="true" />
            {activeCount ? (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary-fill text-[10px] font-semibold text-primary-foreground">
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
      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            setSearch("");
            apply({});
          }}
        >
          <X aria-hidden="true" /> Clear filters
        </Button>
      ) : null}
    </div>
  );
}
