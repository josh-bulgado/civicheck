import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DataTablePagination } from "~/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { useAccountActions } from "../hooks/useAccountActions";
import type {
  AccountCategory,
  AccountFilters,
  AccountSummary,
  AdminCandidate,
  SystemAdminDepartment,
} from "../system-admin.types";

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
import { AccountConfirmDialog } from "./AccountConfirmDialog";
import { AccountHistoryDialog } from "./AccountHistoryDialog";
import { createAccountColumns } from "./AccountsColumn";
import { AccountsTableToolbar } from "./AccountsTableToolbar";
import { EditAccountDialog } from "./EditAccountDialog";
import { ReplaceCcroAdminDialog } from "./ReplaceCcroAdminDialog";
import { ResendVerificationDialog } from "./ResendVerificationDialog";
import { SuspendAccountDialog } from "./SuspendAccountDialog";

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
  const [replacementOpen, setReplacementOpen] = useState(false);
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
  // page rather than only the rows currently loaded.
  function navigate(nextPage: number, nextFilters: AccountFilters = filters) {
    return router.navigate({
      to: "/system-admin/accounts",
      search: { category, page: nextPage, ...nextFilters },
    });
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const accountNoun =
    category === "personnel"
      ? "personnel account"
      : category === "citizens"
        ? "citizen account"
        : "platform administrator";
  const pendingFor = (type: NonNullable<typeof pendingAction>["type"], id?: string) =>
    pendingAction?.type === type &&
    "accountId" in pendingAction &&
    pendingAction.accountId === id;
  const suspendPending = pendingFor("suspend", suspendTarget?.id);
  const editPending = pendingFor("edit-details", editTarget?.id);
  // Every account mutation — edit, suspend, reactivate, admin replacement —
  // writes a profiles row, so one subscription covers the whole directory.
  const realtimeStatus = useRealtimeRefresh({ tables: ["profiles"] });

  return (
    <div className="space-y-4">
      <AccountsTableToolbar
        category={category}
        filters={filters}
        departments={departments}
        onFiltersChange={(next) => void navigate(1, next)}
        placeholder={`Search ${accountNoun}s by name or email`}
        realtimeStatus={realtimeStatus}
        onReplaceAdministrator={
          category === "personnel"
            ? () => setReplacementOpen(true)
            : undefined
        }
        replaceAdministratorLabel={
          hasActiveAdmin
            ? "Replace CCRO Administrator"
            : "Appoint CCRO Administrator"
        }
      />

      <div className="overflow-hidden rounded-xl border border-border-strong bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface-subtle">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => (
                    <TableHead key={header.id} className="h-12 px-4">
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
            <TableBody className="civic-stagger-auto">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="h-[76px] hover:bg-surface-subtle"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-40 text-center text-muted-foreground"
                  >
                    <SlidersHorizontal className="mx-auto mb-3 size-7 opacity-40" />
                    <p className="text-sm font-medium">
                      No {accountNoun}s found.
                    </p>
                    {hasFilters ? (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => void navigate(1, {})}
                        className="mt-1 h-auto p-0 text-xs"
                      >
                        Clear filters
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t px-5 py-4 text-sm text-muted-foreground">
          {hasFilters
            ? `${total} matching ${accountNoun}${total === 1 ? "" : "s"}`
            : `${total} ${accountNoun}${total === 1 ? "" : "s"}`}
        </div>
      </div>

      {pageCount > 1 ? (
        <DataTablePagination
          table={table}
          pageCount={pageCount}
          pageSizeOptions={[pageSize]}
          onPageChange={(pageIndex) => void navigate(pageIndex + 1)}
        />
      ) : null}

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
              setReplacementOpen(open);
            }
          }}
          onConfirm={replaceAdministrator}
        />
      ) : null}
    </div>
  );
}
