import type { AppColumnDef } from "~/lib/table";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { departmentLabel } from "~/features/admin/staff/staff-table.utils";
import { accountStatusLabels, roleLabels } from "../system-admin.constants";
import { CenterSortHeader, centerSelectionColumn } from "./CenterTableControls";
import type {
  AccountCategory,
  AccountSummary,
  SystemAdminDepartment,
} from "../system-admin.types";
import {
  AccountRowActions,
  type AccountActionHandlers,
} from "./AccountRowActions";

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
      tone: "inactive",
    };
  }
  if (account.invitePending) {
    return { label: "Setup pending", tone: "pending" };
  }
  return { label: accountStatusLabels.active, tone: "active" };
}

function StatusCell({ account }: { account: AccountSummary }) {
  const { label, tone } = accountState(account);

  return (
    <div className="account-status-cell">
      <span className="account-status" data-tone={tone}>
        {label}
      </span>
      {account.suspensionReason ? (
        <p className="account-status-reason line-clamp-2">
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
} & AccountActionHandlers): AppColumnDef<AccountSummary>[] {
  const departmentNames = new Map(
    departments.map((department) => [department.id, department.name]),
  );

  return [
    centerSelectionColumn<AccountSummary>(
      (account) =>
        `${account.firstName} ${account.lastName}`.trim() || account.email,
    ),
    {
      id: "member",
      accessorFn: (account) =>
        `${account.firstName} ${account.lastName}`.trim(),
      header: ({ column }) => (
        <CenterSortHeader label="Member" column={column} />
      ),
      cell: ({ row }) => {
        const account = row.original;
        const fullName =
          `${account.firstName} ${account.lastName}`.trim() ||
          "Unnamed account";

        return (
          <div className="account-member">
            <Avatar className="after:border-0" aria-hidden="true">
              <AvatarFallback className="bg-primary-soft font-semibold text-primary">
                {getInitials(account)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p
                className="truncate font-medium text-foreground"
                title={fullName}
              >
                {fullName}
              </p>
              <p
                className="account-member-email truncate"
                title={account.email}
              >
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
            accessorFn: (account) => roleLabels[account.role],
            header: ({ column }) => (
              <CenterSortHeader label="Role" column={column} />
            ),
            cell: ({ row }) => (
              <span className="text-sm font-medium text-foreground/80">
                {roleLabels[row.original.role]}
              </span>
            ),
          } satisfies AppColumnDef<AccountSummary>,
          {
            id: "department",
            accessorFn: (account) =>
              account.role === "admin"
                ? "All departments"
                : (departmentNames.get(account.departmentId ?? "") ?? ""),
            header: ({ column }) => (
              <CenterSortHeader label="Department" column={column} />
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
                    label === "Unassigned" || label === "Not applicable"
                      ? "text-sm text-muted-foreground"
                      : "text-sm text-foreground/80"
                  }
                >
                  {label === "Unassigned" || label === "Not applicable"
                    ? "—"
                    : label}
                </span>
              );
            },
          } satisfies AppColumnDef<AccountSummary>,
        ]
      : []),
    {
      id: "status",
      accessorFn: (account) => accountState(account).label,
      header: ({ column }) => (
        <CenterSortHeader label="Status" column={column} />
      ),
      cell: ({ row }) => <StatusCell account={row.original} />,
    },
    {
      id: "lastSignIn",
      accessorFn: (account) => account.lastSignInAt,
      header: ({ column }) => (
        <CenterSortHeader label="Last sign-in" column={column} />
      ),
      cell: ({ row }) => <LastSignInCell account={row.original} />,
    },
    {
      id: "actions",
      enableSorting: false,
      header: "Actions",
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
