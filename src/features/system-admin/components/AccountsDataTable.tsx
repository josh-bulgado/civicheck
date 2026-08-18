import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
  AccountSummary,
  AdminCandidate,
  SystemAdminDepartment,
} from "../system-admin.types";
import { createAccountColumns } from "./AccountsColumn";
import { AccountsTableToolbar } from "./AccountsTableToolbar";
import { EditAccountDialog } from "./EditAccountDialog";
import { ReplaceCcroAdminDialog } from "./ReplaceCcroAdminDialog";
import { SuspendAccountDialog } from "./SuspendAccountDialog";

export function AccountsDataTable({
  data,
  adminCandidates,
  departments,
  hasActiveAdmin,
  category,
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
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<AccountSummary | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<AccountSummary | null>(null);
  const [replacementOpen, setReplacementOpen] = useState(false);
  const {
    pendingAction,
    suspend,
    reactivate,
    updateDetails,
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
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount,
    globalFilterFn: (row, _columnId, value: string) =>
      `${row.original.firstName} ${row.original.lastName} ${row.original.email} ${row.original.role} ${row.original.status}`
        .toLowerCase()
        .includes(value.trim().toLowerCase()),
  });

  function navigate(nextPage: number) {
    return router.navigate({
      to: "/system-admin/accounts",
      search: { category, page: nextPage },
    });
  }

  const filteredCount = table.getFilteredRowModel().rows.length;
  const accountNoun =
    category === "personnel"
      ? "personnel account"
      : category === "citizens"
        ? "citizen account"
        : "platform administrator";
  const suspendPending =
    pendingAction?.type === "suspend" &&
    pendingAction.accountId === suspendTarget?.id;
  const editPending =
    pendingAction?.type === "edit-details" &&
    pendingAction.accountId === editTarget?.id;
  // Every account mutation — edit, suspend, reactivate, admin replacement —
  // writes a profiles row, so one subscription covers the whole directory.
  const realtimeStatus = useRealtimeRefresh({ tables: ["profiles"] });

  return (
    <div className="space-y-4">
      <AccountsTableToolbar
        value={globalFilter}
        onChange={setGlobalFilter}
        placeholder={`Filter ${accountNoun}s`}
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
                    <TableHead key={header.id} className="h-12 px-5">
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
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="h-[76px] hover:bg-surface-subtle"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-5 py-3">
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
                    {globalFilter ? (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setGlobalFilter("")}
                        className="mt-1 h-auto p-0 text-xs"
                      >
                        Clear filter
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t px-5 py-4 text-sm text-muted-foreground">
          {globalFilter
            ? `${filteredCount} of ${data.length} ${accountNoun}${data.length === 1 ? "" : "s"} on this page`
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
