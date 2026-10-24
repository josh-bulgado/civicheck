import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { SortHeader } from "~/components/ui/data-table-column-header";
import { departmentLabel } from "~/features/admin/staff/staff-table.utils";
import { accountStatusLabels, roleLabels } from "../system-admin.constants";
import type {
  AccountCategory,
  AccountSummary,
  SystemAdminDepartment,
} from "../system-admin.types";
import {
  AccountRowActions,
  type AccountActionHandlers,
} from "./AccountRowActions";

const plainHeaderClassName = "text-xs font-semibold text-muted-foreground";

function getInitials(account: AccountSummary) {
  const initials = `${account.firstName.charAt(0)}${account.lastName.charAt(0)}`;
  return initials.toUpperCase() || account.email.charAt(0).toUpperCase();
}

function formatRelative(lastSignInAt: string) {
  const diffMinutes = Math.round(
    (Date.now() - new Date(lastSignInAt).getTime()) / 60_000,
  );
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

/**
 * Where the account stands. A suspended or deactivated account stays that
 * even if its invitation was never accepted, so the three never overlap.
 */
function accountState(account: AccountSummary) {
  if (account.status !== "active") {
    return {
      label: accountStatusLabels[account.status],
      dotClassName: "bg-destructive",
    };
  }
  if (account.invitePending) {
    return { label: "Setup pending", dotClassName: "bg-warning" };
  }
  return { label: accountStatusLabels.active, dotClassName: "bg-success" };
}

function StatusCell({ account }: { account: AccountSummary }) {
  const { label, dotClassName } = accountState(account);

  return (
    <div className="max-w-48">
      <span className="flex items-center gap-2 text-sm text-foreground/75">
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${dotClassName}`}
        />
        {label}
      </span>
      {account.suspensionReason ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {account.suspensionReason}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Sign-in recency, not live presence: Supabase only records when a session was
 * created, so this cannot tell whether someone is using the system right now.
 */
function LastSignInCell({ account }: { account: AccountSummary }) {
  const { lastSignInAt } = account;

  // Sending and cancelling the invitation is the CCRO Administrator's job, so
  // this is visibility only.
  if (account.invitePending && account.invitedAt) {
    return (
      <span className="whitespace-nowrap text-sm text-muted-foreground">
        Invite sent {formatRelative(account.invitedAt)}
      </span>
    );
  }

  if (!lastSignInAt) {
    return <Badge variant="neutral">Never signed in</Badge>;
  }

  return (
    <span
      className="whitespace-nowrap text-sm text-muted-foreground"
      title={new Date(lastSignInAt).toLocaleString()}
    >
      {formatRelative(lastSignInAt)}
    </span>
  );
}

export function createAccountColumns({
  category,
  departments,
  pendingAccountId,
  onEdit,
  onSuspend,
  onReactivate,
  onViewHistory,
  onSendPasswordReset,
  onResendVerification,
  onRevokeSessions,
}: {
  category: AccountCategory;
  departments: SystemAdminDepartment[];
  pendingAccountId: string | null;
} & AccountActionHandlers): ColumnDef<AccountSummary>[] {
  const departmentNames = new Map(
    departments.map((department) => [department.id, department.name]),
  );

  return [
    {
      id: "member",
      accessorFn: (account) => `${account.firstName} ${account.lastName}`.trim(),
      header: ({ column }) => <SortHeader column={column}>Member</SortHeader>,
      cell: ({ row }) => {
        const account = row.original;
        const fullName =
          `${account.firstName} ${account.lastName}`.trim() ||
          "Unnamed account";

        return (
          <div className="flex min-w-72 items-center gap-3.5">
            <Avatar size="lg" className="bg-primary">
              <AvatarFallback className="bg-primary-fill font-semibold text-white">
                {getInitials(account)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {fullName}
              </p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {account.email}
              </p>
            </div>
          </div>
        );
      },
    },
    ...(category === "personnel"
      ? [
          {
            id: "role",
            header: () => <span className={plainHeaderClassName}>Role</span>,
            cell: ({ row }) => (
              <span className="text-sm font-medium text-foreground/80">
                {roleLabels[row.original.role]}
              </span>
            ),
          } satisfies ColumnDef<AccountSummary>,
          {
            id: "department",
            header: () => (
              <span className={plainHeaderClassName}>Department</span>
            ),
            cell: ({ row }) => {
              const { role, departmentId } = row.original;
              const label = departmentLabel({
                role,
                departmentName: departmentId
                  ? (departmentNames.get(departmentId) ?? null)
                  : null,
              });

              return (
                <span
                  className={
                    label === "Unassigned"
                      ? "text-sm italic text-muted-foreground"
                      : "text-sm text-foreground/80"
                  }
                >
                  {label}
                </span>
              );
            },
          } satisfies ColumnDef<AccountSummary>,
        ]
      : []),
    {
      id: "status",
      header: () => <span className={plainHeaderClassName}>Status</span>,
      cell: ({ row }) => <StatusCell account={row.original} />,
    },
    {
      id: "lastSignIn",
      header: () => <span className={plainHeaderClassName}>Last sign-in</span>,
      cell: ({ row }) => <LastSignInCell account={row.original} />,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortHeader column={column}>Created</SortHeader>,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <AccountRowActions
          account={row.original}
          isPending={pendingAccountId === row.original.id}
          onEdit={onEdit}
          onSuspend={onSuspend}
          onReactivate={onReactivate}
          onViewHistory={onViewHistory}
          onSendPasswordReset={onSendPasswordReset}
          onResendVerification={onResendVerification}
          onRevokeSessions={onRevokeSessions}
        />
      ),
    },
  ];
}
