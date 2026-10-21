import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
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
import type { Department, StaffMember } from "../staff.types";
import {
  useCancelStaffInvitation,
  useResendStaffInvitation,
} from "../hooks/useStaffInvitationActions";
import {
  useDeactivateStaffMember,
  useReactivateStaffMember,
} from "../hooks/useStaffManagementActions";
import { CancelStaffInvitationDialog } from "./CancelStaffInvitationDialog";
import { createStaffColumns } from "./StaffColumn";
import { ManageStaffAccessDialog } from "./ManageStaffAccessDialog";
import { RemoveStaffMemberDialog } from "./RemoveStaffMemberDialog";
import { StaffTableToolbar } from "./StaffTableToolbar";
import {
  countByRole,
  matchesRole,
  matchesSearch,
  matchesStatus,
  type RoleFilter,
  type StatusFilter,
} from "../staff-table.utils";

export function StaffDataTable({
  data,
  departments,
}: {
  data: StaffMember[];
  departments: Department[];
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [checkingStaffId, setCheckingStaffId] = useState<string | null>(null);
  const [manageTarget, setManageTarget] = useState<StaffMember | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StaffMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const resendInvitation = useResendStaffInvitation();
  const cancelInvitation = useCancelStaffInvitation();
  const removeStaff = useDeactivateStaffMember();
  const reactivateStaff = useReactivateStaffMember();

  const resendingStaffId =
    resendInvitation.status === "pending"
      ? (resendInvitation.variables?.data.staffId ?? null)
      : null;

  const resend = resendInvitation.mutate;
  const handleResend = useCallback(
    (staffMember: StaffMember) => {
      void resend({ data: { staffId: staffMember.id } });
    },
    [resend],
  );

  const handleCancelRequest = useCallback((staffMember: StaffMember) => {
    setCancelTarget(staffMember);
  }, []);

  const handleCheckStatus = useCallback(
    async (staffMember: StaffMember) => {
      setCheckingStaffId(staffMember.id);
      try {
        await router.invalidate();
        toast.success("Staff status refreshed from Supabase.");
      } catch (error) {
        toast.error("Unable to refresh staff status", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setCheckingStaffId(null);
      }
    },
    [router],
  );

  const handleManageRequest = useCallback((staffMember: StaffMember) => {
    setManageTarget(staffMember);
  }, []);

  const handleRemoveRequest = useCallback((staffMember: StaffMember) => {
    setRemoveTarget(staffMember);
  }, []);

  const reactivate = reactivateStaff.mutate;
  const columns = useMemo(
    () =>
      createStaffColumns({
        checkingStaffId,
        resendingStaffId,
        onCheckStatus: (staffMember) => void handleCheckStatus(staffMember),
        onManage: handleManageRequest,
        onResend: handleResend,
        onCancel: handleCancelRequest,
        onRemove: handleRemoveRequest,
        onReactivate: (staffMember) =>
          void reactivate({ data: { staffId: staffMember.id } }),
      }),
    [
      checkingStaffId,
      handleCancelRequest,
      handleCheckStatus,
      handleManageRequest,
      handleRemoveRequest,
      handleResend,
      resendingStaffId,
      reactivate,
    ],
  );

  // The role chips count the rows the search and status filter leave, so a chip
  // never promises more than the table will show.
  const roleCounts = useMemo(
    () =>
      countByRole(
        data.filter(
          (staffMember) =>
            matchesSearch(staffMember, globalFilter) &&
            matchesStatus(staffMember, statusFilter),
        ),
      ),
    [data, globalFilter, statusFilter],
  );

  const rows = useMemo(
    () =>
      data.filter(
        (staffMember) =>
          matchesRole(staffMember, roleFilter) &&
          matchesStatus(staffMember, statusFilter),
      ),
    [data, roleFilter, statusFilter],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
    globalFilterFn: (row, _id, value: string) =>
      matchesSearch(row.original, value),
  });

  const handleClearFilters = () => {
    setGlobalFilter("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  async function confirmCancellation() {
    if (!cancelTarget) return;

    const result = await cancelInvitation.mutate({
      data: { staffId: cancelTarget.id },
    });
    if (result && !result.error) setCancelTarget(null);
  }

  async function confirmRemoval() {
    if (!removeTarget) return;

    const result = await removeStaff.mutate({
      data: { staffId: removeTarget.id },
    });
    if (result && !result.error) setRemoveTarget(null);
  }

  return (
    <>
      {/* One card: filters, table, pagination. */}
      <div className="overflow-hidden rounded-xl border border-border-strong bg-card">
        <div className="border-b border-border px-5 py-4">
          <StaffTableToolbar
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            roleCounts={roleCounts}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-border bg-surface-subtle">
              {table.getHeaderGroups().map((group) => (
                <TableRow
                  key={group.id}
                  className="hover:bg-transparent [&>:first-child]:pl-5 [&>:last-child]:pr-5"
                >
                  {group.headers.map((header) => (
                    <TableHead key={header.id}>
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
                    className="hover:bg-surface-subtle [&>:first-child]:pl-5 [&>:last-child]:pr-5"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
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
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SlidersHorizontal
                        aria-hidden="true"
                        className="size-8 text-muted-foreground/50"
                      />
                      <p className="text-sm font-medium">
                        No staff members found matching your filters.
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-auto p-0 text-xs"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4">
          <DataTablePagination table={table} />
        </div>
      </div>

      <ManageStaffAccessDialog
        staffMember={manageTarget}
        departments={departments}
        onOpenChange={(open) => {
          if (!open) setManageTarget(null);
        }}
      />
      <CancelStaffInvitationDialog
        staffMember={cancelTarget}
        isPending={cancelInvitation.status === "pending"}
        onOpenChange={(open) => {
          if (!open && cancelInvitation.status !== "pending") {
            setCancelTarget(null);
          }
        }}
        onConfirm={() => void confirmCancellation()}
      />
      <RemoveStaffMemberDialog
        staffMember={removeTarget}
        isPending={removeStaff.status === "pending"}
        onOpenChange={(open) => {
          if (!open && removeStaff.status !== "pending") {
            setRemoveTarget(null);
          }
        }}
        onConfirm={() => void confirmRemoval()}
      />
    </>
  );
}
