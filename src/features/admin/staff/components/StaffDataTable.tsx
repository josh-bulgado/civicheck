import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTableCard } from "~/components/ui/data-table-card";
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
      <DataTableCard
        table={table}
        cellClassName="py-3"
        toolbar={
          <StaffTableToolbar
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            roleCounts={roleCounts}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        }
        label="Staff members"
        emptyLabel="No staff members found matching your filters."
        onClearFilters={handleClearFilters}
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
    </>
  );
}
