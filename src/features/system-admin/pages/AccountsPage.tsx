import { useState } from "react";
import { UserRoundPlus } from "lucide-react";
import { QuietLink as Link } from "~/components/quiet-link";
import { Button } from "~/components/ui/button";
import { AccountsDataTable } from "../components/AccountsDataTable";
import {
  accountCategories,
  accountCategoryLabels,
} from "../system-admin.constants";
import type {
  AccountCategory,
  AccountFilters,
  AccountSummary,
  AdminCandidate,
  SystemAdminDepartment,
} from "../system-admin.types";
import "../center-tables.css";
import "../accounts-center.css";

const descriptions = {
  personnel: "CCRO personnel",
  citizens: "Citizens",
  "platform-admins": "Platform administrators",
} satisfies Record<AccountCategory, string>;

export function AccountsPage({
  accounts,
  adminCandidates,
  departments,
  hasActiveAdmin,
  category,
  filters,
  page,
  pageSize,
  total,
  hasNextPage,
  isLoading = false,
  error = null,
  onRefresh,
}: {
  accounts: AccountSummary[];
  adminCandidates: AdminCandidate[];
  departments: SystemAdminDepartment[];
  hasActiveAdmin: boolean;
  category: AccountCategory;
  filters: AccountFilters;
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}) {
  const [replacementOpen, setReplacementOpen] = useState(false);

  return (
    <div className="dashboard-page accounts-center-page">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
            Accounts Center
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {descriptions[category]}
          </p>
        </div>
        {category === "personnel" ? (
          <Button
            size="lg"
            shape="pill"
            className="gap-2 px-4"
            onClick={() => setReplacementOpen(true)}
            disabled={isLoading || !!error}
          >
            <UserRoundPlus aria-hidden="true" />
            {hasActiveAdmin
              ? "Replace CCRO Administrator"
              : "Appoint CCRO Administrator"}
          </Button>
        ) : null}
      </header>
      <nav className="accounts-categories" aria-label="Account group">
        {accountCategories.map((value) => (
          <Link
            key={value}
            to="/system-admin/accounts"
            search={{ category: value, page: 1 }}
            resetScroll={false}
            aria-current={category === value ? "page" : undefined}
          >
            {accountCategoryLabels[value]}
          </Link>
        ))}
      </nav>
      <AccountsDataTable
        key={category}
        data={accounts}
        adminCandidates={adminCandidates}
        departments={departments}
        hasActiveAdmin={hasActiveAdmin}
        category={category}
        filters={filters}
        page={page}
        pageSize={pageSize}
        total={total}
        hasNextPage={hasNextPage}
        replacementOpen={replacementOpen}
        onReplacementOpenChange={setReplacementOpen}
        isLoading={isLoading}
        error={error}
        onRefresh={onRefresh}
      />
    </div>
  );
}
