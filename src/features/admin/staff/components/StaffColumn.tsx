import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { Role } from "~/lib/permissions";
import type { StaffMember } from "../staff.types";
import { StaffRowActions } from "./StaffRowActions";

const roleLabels: Partial<Record<Role, string>> = {
  admin: "Administrator",
  frontdesk: "Front desk",
  staff: "Staff",
  supervisor: "Supervisor",
  cashier: "Cashier",
};

const employmentLabels = {
  regular: "Regular",
  job_order: "Job order",
  contractual: "Contractual",
} as const;

function getInitials(staffMember: StaffMember) {
  const initials = `${staffMember.firstName.charAt(0)}${staffMember.lastName.charAt(0)}`;
  return initials.toUpperCase() || staffMember.email.charAt(0).toUpperCase();
}

const headerClassName =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

export function createStaffColumns({
  checkingStaffId,
  resendingStaffId,
  onCheckStatus,
  onManage,
  onResend,
  onCancel,
  onRemove,
}: {
  checkingStaffId: string | null;
  resendingStaffId: string | null;
  onCheckStatus: (staffMember: StaffMember) => void;
  onManage: (staffMember: StaffMember) => void;
  onResend: (staffMember: StaffMember) => void;
  onCancel: (staffMember: StaffMember) => void;
  onRemove: (staffMember: StaffMember) => void;
}): ColumnDef<StaffMember>[] {
  return [
    {
      accessorKey: "firstName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={`${headerClassName} -ml-3 h-8 hover:bg-transparent hover:text-foreground`}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Member
          <ArrowUpDown className="size-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const staffMember = row.original;
        const fullName =
          `${staffMember.firstName} ${staffMember.lastName}`.trim() ||
          "Unnamed staff";

        return (
          <div className="flex min-w-72 items-center gap-3.5">
            <Avatar size="lg" className="bg-muted/60">
              <AvatarFallback className="bg-primary/8 font-semibold text-primary">
                {getInitials(staffMember)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-foreground">
                  {fullName}
                </span>
                {!staffMember.confirmed ? (
                  <Badge className="h-5 border-amber-300 bg-amber-50 px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Invited
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {staffMember.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "departmentName",
      header: () => <span className={headerClassName}>Department</span>,
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80">
          {row.original.departmentName}
        </span>
      ),
    },
    {
      accessorKey: "employmentType",
      header: () => <span className={headerClassName}>Employment</span>,
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80">
          {employmentLabels[row.original.employmentType]}
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: () => <span className={headerClassName}>Role</span>,
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground/80">
          {roleLabels[row.original.role] ?? row.original.role}
        </span>
      ),
    },
    {
      id: "status",
      header: () => <span className={headerClassName}>Status</span>,
      cell: ({ row }) => {
        const staffMember = row.original;
        const isChecking = checkingStaffId === staffMember.id;
        const label = staffMember.confirmed
          ? "Active"
          : staffMember.emailConfirmed
            ? "Setup pending"
            : "Invitation pending";

        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={isChecking}
            onClick={() => onCheckStatus(staffMember)}
            title="Refresh status from Supabase"
            className="-ml-3 h-8 gap-2 px-3 font-normal text-foreground/75"
          >
            <span
              className={`size-2 rounded-full ${
                staffMember.confirmed ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {label}
            <RefreshCw className={isChecking ? "animate-spin" : "opacity-50"} />
          </Button>
        );
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <StaffRowActions
            staffMember={row.original}
            isResending={resendingStaffId === row.original.id}
            onManage={onManage}
            onResend={onResend}
            onCancel={onCancel}
            onRemove={onRemove}
          />
        </div>
      ),
    },
  ];
}
