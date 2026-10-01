import { createFileRoute, redirect } from "@tanstack/react-router";
import { AccountsPage } from "~/features/system-admin/pages/AccountsPage";
import { getAccounts } from "~/features/system-admin/system-admin.functions";
import { hasPermission, type AccountStatus, type Role } from "~/lib/permissions";
import type {
  AccountCategory,
  AccountFilters,
} from "~/features/system-admin/system-admin.types";

type AccountsSearch = AccountFilters & {
  category: AccountCategory;
  page: number;
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

function normalizeCategory(value: unknown): AccountCategory {
  return value === "citizens" || value === "platform-admins"
    ? value
    : "personnel";
}

function optionalText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined;
}

export const Route = createFileRoute("/_authed/_dashboard/system-admin/accounts")({
  validateSearch: (search: Record<string, unknown>): AccountsSearch => ({
    category: normalizeCategory(search.category),
    page: Math.max(1, Number(search.page) || 1),
    q: optionalText(search.q, 100),
    role: ROLES.find((role) => role === search.role),
    status: STATUSES.find((status) => status === search.status),
    departmentId: optionalText(search.departmentId, 100),
    signIn: search.signIn === "never" ? "never" : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "accounts:view_all")
    )
      throw redirect({ to: "/dashboard" });
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getAccounts({ data: { ...deps, pageSize: 20 } }),
  component: () => {
    const data = Route.useLoaderData();
    const { q, role, status, departmentId, signIn } = Route.useSearch();
    return (
      <AccountsPage
        {...data}
        filters={{ q, role, status, departmentId, signIn }}
      />
    );
  },
});
