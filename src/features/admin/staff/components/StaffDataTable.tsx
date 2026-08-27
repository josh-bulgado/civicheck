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
import { SlidersHorizontal, UserPlus } from "lucide-react";
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
import { StaffInviteDialog } from "./StaffInviteDialog";
import { StaffTableToolbar } from "./StaffTableToolbar";

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
  const [inviteOpen, setInviteOpen] = useState(false);
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

  const handleResend = useCallback(
    (staffMember: StaffMember) => {
      void resendInvitation.mutate({ data: { staffId: staffMember.id } });
    },
    [resendInvitation.mutate],
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
          void reactivateStaff.mutate({ data: { staffId: staffMember.id } }),
      }),
    [
      checkingStaffId,
      handleCancelRequest,
      handleCheckStatus,
      handleManageRequest,
      handleRemoveRequest,
      handleResend,
      resendingStaffId,
      reactivateStaff.mutate,
    ],
  );

  const table = useReactTable({
    data,
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
      `${row.original.firstName} ${row.original.lastName} ${row.original.email} ${row.original.role} ${row.original.departmentName ?? ""} ${row.original.employmentType}`
        .toLowerCase()
        .includes(value.trim().toLowerCase()),
  });

  const filteredCount = table.getFilteredRowModel().rows.length;

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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StaffTableToolbar value={globalFilter} onChange={setGlobalFilter} />
        <Button onClick={() => setInviteOpen(true)} className="sm:shrink-0">
          <UserPlus className="size-4" />
          Invite Staff
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-strong bg-white">
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
          <TableBody className="civic-stagger-auto">
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
                  <p className="text-sm font-medium">No staff members found.</p>
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

        <div className="border-t px-5 py-4 text-sm text-muted-foreground">
          {filteredCount === data.length
            ? `${data.length} staff member${data.length === 1 ? "" : "s"}`
            : `${filteredCount} of ${data.length} staff members`}
        </div>
      </div>

      {table.getPageCount() > 1 ? <DataTablePagination table={table} /> : null}

      <StaffInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        departments={departments}
      />
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
    </div>
  );
}
