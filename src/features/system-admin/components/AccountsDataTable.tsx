import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  flexRender,
  useTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { CenterTablePagination } from "./CenterTableControls";
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
import { appTableFeatures } from "~/lib/table";
import { createAccountColumns } from "./AccountsColumn";
import { AccountsTableToolbar } from "./AccountsTableToolbar";
import { AccountsTableSkeleton } from "./AccountsTableSkeleton";
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
  isLoading = false,
  error = null,
  onRefresh,
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
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
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
  } = useAccountActions(onRefresh);

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

  const table = useTable({
    features: appTableFeatures,
    data,
    getRowId: (account) => account.id,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
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
    replace = false,
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
      replace,
      resetScroll: false,
    });
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const { noun: accountNoun, label: tableLabel } = accountCopy[category];
  const pendingFor = (
    type: NonNullable<typeof pendingAction>["type"],
    id?: string,
  ) =>
    pendingAction?.type === type &&
    "accountId" in pendingAction &&
    pendingAction.accountId === id;
  const suspendPending = pendingFor("suspend", suspendTarget?.id);
  const editPending = pendingFor("edit-details", editTarget?.id);

  return (
    <>
      <div
        className="accounts-directory-card center-table-card"
        aria-busy={isLoading}
      >
        <AccountsTableToolbar
          category={category}
          filters={filters}
          departments={departments}
          onFiltersChange={(next) => void navigate(1, next, pageSize, true)}
        />
        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border-lighter px-6 py-4 text-sm"
          >
            <p>{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              Try again
            </Button>
          </div>
        ) : null}
        <Table
          className="accounts-directory-table center-table"
          aria-label={tableLabel}
        >
          <colgroup>
            <col style={{ width: 48 }} />
            {category === "personnel" ? (
              <>
                <col className="w-[25%]" />
                <col className="w-[17%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
              </>
            ) : (
              <>
                <col className="w-[40%]" />
                <col className="w-[23%]" />
                <col className="w-[20%]" />
                <col className="w-[17%]" />
              </>
            )}
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow
                key={group.id}
                className="border-border-lighter hover:bg-transparent"
              >
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-12 px-6 text-xs font-semibold text-muted-foreground"
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <AccountsTableSkeleton category={category} />
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="h-[68px] border-border-lighter hover:bg-surface-subtle/60"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 px-5 text-center"
                >
                  <Search
                    className="mx-auto mb-3 size-6 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                  <p className="font-medium">
                    {hasFilters
                      ? `No ${accountNoun}s match these filters.`
                      : `No ${accountNoun}s yet.`}
                  </p>
                  {hasFilters ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1"
                      onClick={() => void navigate(1, {})}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        <CenterTablePagination
          table={table}
          pageCount={pageCount}
          total={total}
          pageSizeOptions={[...accountPageSizes]}
          onPageChange={(pageIndex) => void navigate(pageIndex + 1)}
          onPageSizeChange={(size) => void navigate(1, filters, size)}
          disabled={isLoading || !!error}
        />
      </div>
      <p role="status" className="sr-only">
        {isLoading
          ? `Loading ${tableLabel.toLowerCase()}`
          : error
            ? "Accounts could not be loaded"
            : `${total} accounts`}
      </p>

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
