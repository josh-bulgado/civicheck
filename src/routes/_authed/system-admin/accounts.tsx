import { createFileRoute, redirect } from "@tanstack/react-router";
import { AccountsPage } from "~/features/system-admin/AccountsPage";
import { getAccounts } from "~/features/system-admin/system-admin.functions";
import { hasPermission, type Role } from "~/lib/permissions";
import type { AccountCategory } from "~/features/system-admin/system-admin.types";

function normalizeCategory(value: unknown): AccountCategory {
  return value === "citizens" || value === "platform-admins"
    ? value
    : "personnel";
}

export const Route = createFileRoute("/_authed/system-admin/accounts")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: normalizeCategory(search.category),
    page: Math.max(1, Number(search.page) || 1),
  }),
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "accounts:view_all")) throw redirect({ to: "/dashboard" });
  },
  loaderDeps: ({ search }) => ({
    category: search.category,
    page: search.page,
  }),
  loader: ({ deps }) =>
    getAccounts({
      data: { category: deps.category, page: deps.page, pageSize: 20 },
    }),
  component: () => { const data = Route.useLoaderData(); return <AccountsPage {...data} />; },
});
