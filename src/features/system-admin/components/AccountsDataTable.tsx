import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { DataTableCard } from "~/components/ui/data-table-card";
import { DataTablePagination } from "~/components/ui/data-table-pagination";
import { useAccountActions } from "../hooks/useAccountActions";
import {
  accountPageSizes,
  defaultAccountPageSize,
} from "../system-admin.constants";
import type {
  AccountCategory,
  AccountFilters,
  AccountSummary,
  AdminCandidate,
  SystemAdminDepartment,
} from "../system-admin.types";
import { AccountConfirmDialog } from "./AccountConfirmDialog";
import { AccountHistoryDialog } from "./AccountHistoryDialog";
import { createAccountColumns } from "./AccountsColumn";
import { AccountsTableToolbar } from "./AccountsTableToolbar";
import { EditAccountDialog } from "./EditAccountDialog";
import { ReplaceCcroAdminDialog } from "./ReplaceCcroAdminDialog";
import { ResendVerificationDialog } from "./ResendVerificationDialog";
import { SuspendAccountDialog } from "./SuspendAccountDialog";

const passwordResetCopy = {
  title: "Send password reset link?",
  description: (account: AccountSummary) =>
    `${account.email} will receive an email with a single-use link to choose a new password. Their current password keeps working until they use it.`,
  confirmLabel: "Send reset link",
  pendingLabel: "Sending",
};

const revokeSessionsCopy = {
  title: "Sign out of all sessions?",
  description: (account: AccountSummary) =>
    `${account.email} will be signed out on every device and asked to sign in again. Use this for a lost device or suspected compromise.`,
  confirmLabel: "Sign out everywhere",
  pendingLabel: "Signing out",
  destructive: true,
};

const accountCopy = {
  personnel: { noun: "personnel account", label: "Personnel accounts" },
  citizens: { noun: "citizen account", label: "Citizen accounts" },
  "platform-admins": {
    noun: "platform administrator",
    label: "Platform administrators",
  },
} satisfies Record<AccountCategory, { noun: string; label: string }>;

export function AccountsDataTable({
  data,
  adminCandidates,
  departments,
  hasActiveAdmin,
  category,
  filters,
  page,
  pageSize,
  total,
  hasNextPage,
  replacementOpen,
  onReplacementOpenChange,
}: {
  data: AccountSummary[];
  adminCandidates: AdminCandidate[];
  departments: SystemAdminDepartment[];
  hasActiveAdmin: boolean;
  category: AccountCategory;
  filters: AccountFilters;
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  replacementOpen: boolean;
  onReplacementOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [suspendTarget, setSuspendTarget] = useState<AccountSummary | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<AccountSummary | null>(null);
  const [historyTarget, setHistoryTarget] = useState<AccountSummary | null>(
    null,
  );
  const [resetTarget, setResetTarget] = useState<AccountSummary | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AccountSummary | null>(null);
  const [verificationTarget, setVerificationTarget] =
    useState<AccountSummary | null>(null);
  const {
    pendingAction,
    suspend,
    reactivate,
    updateDetails,
    sendPasswordReset,
    revokeSessions,
    resendVerification,
    replaceAdministrator,
  } = useAccountActions();

  const pendingAccountId =
    pendingAction && "accountId" in pendingAction
      ? pendingAction.accountId
      : null;
  const pageCount = Math.max(
    Math.ceil(total / pageSize),
    hasNextPage ? page + 1 : page,
  );
  const pagination: PaginationState = { pageIndex: page - 1, pageSize };

  const handleSuspendRequest = useCallback((account: AccountSummary) => {
    setSuspendTarget(account);
  }, []);

  const handleEditRequest = useCallback((account: AccountSummary) => {
    setEditTarget(account);
  }, []);

  const handleReactivate = useCallback(
    (account: AccountSummary) => {
      void reactivate(account.id);
    },
    [reactivate],
  );

  const columns = useMemo(
    () =>
      createAccountColumns({
        category,
        departments,
        pendingAccountId,
        onEdit: handleEditRequest,
        onSuspend: handleSuspendRequest,
        onReactivate: handleReactivate,
        onViewHistory: setHistoryTarget,
        onSendPasswordReset: setResetTarget,
        onResendVerification: setVerificationTarget,
        onRevokeSessions: setRevokeTarget,
      }),
    [
      category,
      departments,
      handleEditRequest,
      handleReactivate,
      handleSuspendRequest,
      pendingAccountId,
    ],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount,
  });

  // Filters live in the URL and are applied by the server, so they span every
  // page rather than only the rows currently loaded. The default page size is
  // left out of the URL.
  function navigate(
    nextPage: number,
    nextFilters: AccountFilters = filters,
    nextPageSize: number = pageSize,
  ) {
    return router.navigate({
      to: "/system-admin/accounts",
      search: {
        category,
        page: nextPage,
        pageSize:
          nextPageSize === defaultAccountPageSize ? undefined : nextPageSize,
        ...nextFilters,
      },
    });
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const { noun: accountNoun, label: tableLabel } = accountCopy[category];
  const pendingFor = (type: NonNullable<typeof pendingAction>["type"], id?: string) =>
    pendingAction?.type === type &&
    "accountId" in pendingAction &&
    pendingAction.accountId === id;
  const suspendPending = pendingFor("suspend", suspendTarget?.id);
  const editPending = pendingFor("edit-details", editTarget?.id);

  return (
    <>
      <DataTableCard
        table={table}
        cellClassName="py-3"
        toolbar={
          <AccountsTableToolbar
            category={category}
            filters={filters}
            departments={departments}
            onFiltersChange={(next) => void navigate(1, next)}
            onCategoryChange={(next) =>
              void router.navigate({
                to: "/system-admin/accounts",
                search: { category: next, page: 1 },
              })
            }
          />
        }
        label={tableLabel}
        emptyLabel={
          hasFilters
            ? `No ${accountNoun}s match these filters.`
            : `No ${accountNoun}s yet.`
        }
        onClearFilters={hasFilters ? () => void navigate(1, {}) : undefined}
        footer={
          <DataTablePagination
            table={table}
            pageCount={pageCount}
            total={total}
            pageSizeOptions={[...accountPageSizes]}
            onPageChange={(pageIndex) => void navigate(pageIndex + 1)}
            onPageSizeChange={(size) => void navigate(1, filters, size)}
          />
        }
      />

      <SuspendAccountDialog
        account={suspendTarget}
        isPending={suspendPending}
        onOpenChange={(open) => {
          if (!open && !suspendPending) setSuspendTarget(null);
        }}
        onConfirm={(reason) =>
          suspendTarget
            ? suspend(suspendTarget.id, reason)
            : Promise.resolve(false)
        }
      />
      <EditAccountDialog
        account={editTarget}
        departments={departments}
        isPending={editPending}
        onOpenChange={(open) => {
          if (!open && !editPending) setEditTarget(null);
        }}
        onConfirm={updateDetails}
      />
      <AccountHistoryDialog
        account={historyTarget}
        onOpenChange={(open) => {
          if (!open) setHistoryTarget(null);
        }}
      />
      <AccountConfirmDialog
        account={resetTarget}
        copy={passwordResetCopy}
        isPending={pendingFor("password-reset", resetTarget?.id)}
        onOpenChange={(open) => {
          if (!open && !pendingFor("password-reset", resetTarget?.id)) {
            setResetTarget(null);
          }
        }}
        onConfirm={(account) => sendPasswordReset(account.id)}
      />
      <AccountConfirmDialog
        account={revokeTarget}
        copy={revokeSessionsCopy}
        isPending={pendingFor("revoke-sessions", revokeTarget?.id)}
        onOpenChange={(open) => {
          if (!open && !pendingFor("revoke-sessions", revokeTarget?.id)) {
            setRevokeTarget(null);
          }
        }}
        onConfirm={(account) => revokeSessions(account.id)}
      />
      <ResendVerificationDialog
        account={verificationTarget}
        isPending={pendingFor("resend-verification", verificationTarget?.id)}
        onOpenChange={(open) => {
          if (
            !open &&
            !pendingFor("resend-verification", verificationTarget?.id)
          ) {
            setVerificationTarget(null);
          }
        }}
        onConfirm={(account, email) => resendVerification(account.id, email)}
      />
      {category === "personnel" ? (
        <ReplaceCcroAdminDialog
          open={replacementOpen}
          adminCandidates={adminCandidates}
          departments={departments}
          hasActiveAdmin={hasActiveAdmin}
          isPending={pendingAction?.type === "replace-admin"}
          onOpenChange={(open) => {
            if (pendingAction?.type !== "replace-admin") {
              onReplacementOpenChange(open);
            }
          }}
          onConfirm={replaceAdministrator}
        />
      ) : null}
    </>
  );
}
