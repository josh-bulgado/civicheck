import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { Role } from "~/lib/permissions";
import type { StaffMember } from "../staff.types";
import { StaffRowActions } from "./StaffRowActions";

const roleLabels: Partial<Record<Role, string>> = {
  admin: "Administrator",
  staff: "Staff",
  supervisor: "Supervisor",
  cashier: "Cashier",
};

const employmentLabels = {
  regular: "Regular",
  job_order: "Job order",
  contractual: "Contractual",
} as const;

const departmentFallbackByRole: Partial<Record<Role, string>> = {
  admin: "All departments",
  cashier: "Not applicable",
};

function getInitials(staffMember: StaffMember) {
  const initials = `${staffMember.firstName.charAt(0)}${staffMember.lastName.charAt(0)}`;
  return initials.toUpperCase() || staffMember.email.charAt(0).toUpperCase();
}

const headerClassName =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

function CopyableEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(email);
          setCopied(true);
          toast.success("Email copied");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy email");
        }
      }}
      title="Copy email"
      aria-label={`Copy ${email}`}
      className="group/email flex min-w-0 items-center gap-1.5 text-left"
    >
      <span className="truncate text-sm text-muted-foreground">{email}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-success" />
      ) : (
        <Copy className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/email:opacity-100" />
      )}
    </button>
  );
}

export function createStaffColumns({
  checkingStaffId,
  resendingStaffId,
  onCheckStatus,
  onManage,
  onResend,
  onCancel,
  onRemove,
  onReactivate,
}: {
  checkingStaffId: string | null;
  resendingStaffId: string | null;
  onCheckStatus: (staffMember: StaffMember) => void;
  onManage: (staffMember: StaffMember) => void;
  onResend: (staffMember: StaffMember) => void;
  onCancel: (staffMember: StaffMember) => void;
  onRemove: (staffMember: StaffMember) => void;
  onReactivate: (staffMember: StaffMember) => void;
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
            <Avatar size="lg" className="bg-primary">
              <AvatarFallback className="bg-primary font-semibold text-white">
                {getInitials(staffMember)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-foreground">
                  {fullName}
                </span>
                {!staffMember.confirmed ? (
                  <Badge className="status-warning h-5 px-2 text-[10px] font-semibold uppercase tracking-wider">
                    Invited
                  </Badge>
                ) : null}
              </div>
              <div className="mt-0.5 min-w-0">
                <CopyableEmail email={staffMember.email} />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "departmentName",
      header: () => <span className={headerClassName}>Department</span>,
      cell: ({ row }) => {
        const staffMember = row.original;
        const fallback = departmentFallbackByRole[staffMember.role];

        if (fallback) {
          return (
            <span className="text-sm text-muted-foreground">{fallback}</span>
          );
        }

        return staffMember.departmentName ? (
          <span className="text-sm text-foreground/80">
            {staffMember.departmentName}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground italic">
            Unassigned
          </span>
        );
      },
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
        const label = staffMember.status !== "active"
          ? "Deactivated"
          : staffMember.confirmed
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
                staffMember.status !== "active" ? "bg-destructive" : staffMember.confirmed ? "bg-success" : "bg-warning"
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
            onReactivate={onReactivate}
          />
        </div>
      ),
    },
  ];
}
