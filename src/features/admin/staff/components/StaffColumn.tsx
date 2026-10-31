import type { AppColumnDef } from "~/lib/table";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { SortHeader } from "~/components/ui/data-table-column-header";
import type { StaffMember } from "../staff.types";
import {
  EMPLOYMENT_LABELS,
  departmentLabel,
  roleLabel,
  staffStatus,
} from "../staff-table.utils";
import { StaffRowActions } from "./StaffRowActions";

function getInitials(staffMember: StaffMember) {
  const initials = `${staffMember.firstName.charAt(0)}${staffMember.lastName.charAt(0)}`;
  return initials.toUpperCase() || staffMember.email.charAt(0).toUpperCase();
}

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
}): AppColumnDef<StaffMember>[] {
  return [
    {
      id: "member",
      accessorFn: (staffMember) =>
        `${staffMember.firstName} ${staffMember.lastName}`.trim(),
      header: ({ column }) => <SortHeader column={column}>Member</SortHeader>,
      cell: ({ row }) => {
        const staffMember = row.original;
        const fullName =
          `${staffMember.firstName} ${staffMember.lastName}`.trim() ||
          "Unnamed staff";

        return (
          <div className="flex min-w-72 items-center gap-3.5">
            <Avatar size="lg" className="bg-primary">
              <AvatarFallback className="bg-primary-fill font-semibold text-white">
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
      id: "department",
      accessorFn: departmentLabel,
      header: ({ column }) => (
        <SortHeader column={column}>Department</SortHeader>
      ),
      cell: ({ row }) => {
        const staffMember = row.original;
        const label = departmentLabel(staffMember);

        if (label === "Unassigned") {
          return (
            <span className="text-sm text-muted-foreground italic">
              {label}
            </span>
          );
        }

        // Roles with no department of their own read as quiet fallback text.
        const isFallback = label !== staffMember.departmentName;
        return (
          <span
            className={
              isFallback
                ? "text-sm text-muted-foreground"
                : "text-sm text-foreground/80"
            }
          >
            {label}
          </span>
        );
      },
    },
    {
      id: "employment",
      accessorFn: (staffMember) =>
        EMPLOYMENT_LABELS[staffMember.employmentType],
      header: ({ column }) => (
        <SortHeader column={column}>Employment</SortHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80">
          {EMPLOYMENT_LABELS[row.original.employmentType]}
        </span>
      ),
    },
    {
      id: "role",
      accessorFn: (staffMember) => roleLabel(staffMember.role),
      header: ({ column }) => <SortHeader column={column}>Role</SortHeader>,
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground/80">
          {roleLabel(row.original.role)}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (staffMember) => staffStatus(staffMember).label,
      header: ({ column }) => <SortHeader column={column}>Status</SortHeader>,
      cell: ({ row }) => {
        const staffMember = row.original;
        const isChecking = checkingStaffId === staffMember.id;
        const { key, label } = staffStatus(staffMember);

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
                key === "deactivated"
                  ? "bg-destructive"
                  : key === "active"
                    ? "bg-success"
                    : "bg-warning"
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
