import { UsersRound } from "lucide-react";
import { AccountsCategoryNav } from "../components/AccountsCategoryNav";
import { AccountsDataTable } from "../components/AccountsDataTable";
import { SystemAdminPageHeader } from "../components/SystemAdminPageHeader";
import type {
  AccountCategory,
  AccountSummary,
  AdminCandidate,
  SystemAdminDepartment,
} from "../system-admin.types";

const pageContent = {
  personnel: {
    eyebrow: "CCRO directory",
    title: "CCRO personnel accounts",
    description:
      "Review personnel access, suspend or reactivate accounts, and manage the CCRO Administrator assignment.",
  },
  citizens: {
    eyebrow: "Citizen directory",
    title: "Citizen accounts",
    description:
      "Review citizen access and suspend or reactivate accounts without opening submissions or documents.",
  },
  "platform-admins": {
    eyebrow: "Protected directory",
    title: "Platform administrators",
    description:
      "Review protected System Administrator accounts. Their access cannot be modified from this directory.",
  },
} satisfies Record<
  AccountCategory,
  { eyebrow: string; title: string; description: string }
>;

export function AccountsPage({
  accounts,
  adminCandidates,
  departments,
  category,
  page,
  pageSize,
  total,
  hasNextPage,
}: {
  accounts: AccountSummary[];
  adminCandidates: AdminCandidate[];
  departments: SystemAdminDepartment[];
  category: AccountCategory;
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}) {
  const content = pageContent[category];

  return (
    <div className="dashboard-page">
      <SystemAdminPageHeader
        icon={UsersRound}
        title="Account oversight"
        description="Manage platform access and administrator assignments without opening citizen submissions or documents."
      />
      <AccountsCategoryNav activeCategory={category} />
      <section className="dashboard-panel overflow-hidden">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            {content.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            {content.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {content.description}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <AccountsDataTable
            key={category}
            data={accounts}
            adminCandidates={adminCandidates}
            departments={departments}
            category={category}
            page={page}
            pageSize={pageSize}
            total={total}
            hasNextPage={hasNextPage}
          />
        </div>
      </section>
    </div>
  );
}
