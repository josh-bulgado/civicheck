import { createFileRoute } from "@tanstack/react-router";
import { AccountsPage } from "~/features/system-admin/pages/AccountsPage";
import { useAccounts } from "~/features/system-admin/hooks/useAccounts";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import {
  accountPageSizes,
  defaultAccountPageSize,
} from "~/features/system-admin/system-admin.constants";
import {
  hasPermission,
  type AccountStatus,
  type Role,
} from "~/lib/permissions";
import type {
  AccountCategory,
  AccountFilters,
  AccountSignInFilter,
} from "~/features/system-admin/system-admin.types";
import { denyAccess } from "~/lib/access";

type AccountsSearch = AccountFilters & {
  category: AccountCategory;
  page: number;
  /** Absent means the default size, which keeps the URL short. */
  pageSize?: number;
};

const ROLES: Role[] = [
  "applicant",
  "staff",
  "supervisor",
  "cashier",
  "admin",
  "system_admin",
];
const STATUSES: AccountStatus[] = ["active", "suspended", "deactivated"];
const SIGN_IN_FILTERS: AccountSignInFilter[] = ["never", "unverified"];

function normalizeCategory(value: unknown): AccountCategory {
  return value === "personnel" || value === "platform-admins"
    ? value
    : "citizens";
}

function optionalText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined;
}

export const Route = createFileRoute(
  "/_authed/_dashboard/system-admin/accounts",
)({
  validateSearch: (search: Record<string, unknown>): AccountsSearch => ({
    category: normalizeCategory(search.category),
    page: Math.max(1, Number(search.page) || 1),
    pageSize: accountPageSizes.find((size) => size === Number(search.pageSize)),
    q: optionalText(search.q, 100),
    role: ROLES.find((role) => role === search.role),
    status: STATUSES.find((status) => status === search.status),
    departmentId: optionalText(search.departmentId, 100),
    signIn: SIGN_IN_FILTERS.find((filter) => filter === search.signIn),
  }),
  beforeLoad: ({ context, location }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "accounts:view_all")
    )
      denyAccess(location);
  },
  // Account reads happen inside the mounted page, so navigation never replaces
  // its heading or controls with a full-page pending view.
  pendingComponent: AccountsPending,
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const { user } = Route.useRouteContext();
  const result = useAccounts(user!.id, search);
  useRealtimeRefresh({ tables: ["profiles"], onRefresh: result.refresh });
  return <AccountsView search={search} {...result} />;
}

function AccountsPending() {
  return <AccountsView search={Route.useSearch()} isLoading />;
}

function AccountsView({
  search,
  data,
  metadata,
  isLoading,
  error,
  refresh,
}: {
  search: AccountsSearch;
} & Partial<ReturnType<typeof useAccounts>>) {
  const {
    category,
    page,
    pageSize = defaultAccountPageSize,
    q,
    role,
    status,
    departmentId,
    signIn,
  } = search;
  return (
    <AccountsPage
      accounts={data?.accounts ?? []}
      adminCandidates={metadata?.adminCandidates ?? []}
      departments={metadata?.departments ?? []}
      hasActiveAdmin={
        metadata?.category === "personnel" ? metadata.hasActiveAdmin : true
      }
      category={category}
      page={page}
      pageSize={pageSize}
      total={data?.total ?? 0}
      hasNextPage={data?.hasNextPage ?? false}
      filters={{ q, role, status, departmentId, signIn }}
      isLoading={isLoading}
      error={error}
      onRefresh={refresh}
    />
  );
}
