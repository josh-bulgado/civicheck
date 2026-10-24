import { useState } from "react";
import { UserRoundCog } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PageHeaderCard } from "~/components/ui/page-header-card";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { AccountsDataTable } from "../components/AccountsDataTable";
import { RealtimeStatusBadge } from "../components/RealtimeStatusBadge";
import type {
  AccountCategory,
  AccountFilters,
  AccountSummary,
  AdminCandidate,
  SystemAdminDepartment,
} from "../system-admin.types";

const descriptions = {
  personnel:
    "System Administration, CCRO personnel. Invitations are managed by the CCRO Administrator.",
  citizens:
    "System Administration, citizens. Their submissions and documents are not shown here.",
  "platform-admins":
    "System Administration, platform administrators. Protected accounts cannot be changed here.",
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
}) {
  const [replacementOpen, setReplacementOpen] = useState(false);
  // Every account mutation (edit, suspend, reactivate, admin replacement)
  // writes a profiles row, so one subscription covers the whole directory.
  const realtimeStatus = useRealtimeRefresh({ tables: ["profiles"] });

  return (
    <div className="dashboard-page">
      <PageHeaderCard title="Accounts Center" description={descriptions[category]}>
        <div className="flex flex-wrap items-center gap-3">
          <RealtimeStatusBadge status={realtimeStatus} />
          {category === "personnel" ? (
            <Button
              variant="raised"
              size="lg"
              onClick={() => setReplacementOpen(true)}
            >
              <UserRoundCog aria-hidden="true" data-icon="inline-start" />
              {hasActiveAdmin
                ? "Replace CCRO Administrator"
                : "Appoint CCRO Administrator"}
            </Button>
          ) : null}
        </div>
      </PageHeaderCard>
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
      />
    </div>
  );
}
