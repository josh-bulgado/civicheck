import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { roleLabels } from "../system-admin.constants";
import type { AccountCategory, AccountSummary } from "../system-admin.types";
import { AccountRowActions } from "./AccountRowActions";

const headerClassName =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

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
 * Sign-in recency, not live presence: Supabase only records when a session was
 * created, so this cannot tell whether someone is using the system right now.
 */
function LastSignInCell({ account }: { account: AccountSummary }) {
  const { lastSignInAt } = account;

  // Invited personnel who have not accepted yet. Sending and cancelling the
  // invitation is the CCRO Administrator's job, so this is visibility only.
  if (account.invitePending && account.invitedAt) {
    return (
      <Badge variant="warning" className="gap-1.5">
        <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
        Invite pending · sent {formatRelative(account.invitedAt)}
      </Badge>
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
  pendingAccountId: string | null;
  onEdit: (account: AccountSummary) => void;
  onSuspend: (account: AccountSummary) => void;
  onReactivate: (account: AccountSummary) => void;
  onViewHistory: (account: AccountSummary) => void;
  onSendPasswordReset: (account: AccountSummary) => void;
  onResendVerification: (account: AccountSummary) => void;
  onRevokeSessions: (account: AccountSummary) => void;
}): ColumnDef<AccountSummary>[] {
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
          Account
          <ArrowUpDown className="size-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const account = row.original;
        const fullName =
          `${account.firstName} ${account.lastName}`.trim() ||
          "Unnamed account";

        return (
          <div className="flex min-w-56 items-center gap-3">
            <Avatar size="lg" className="bg-primary">
              <AvatarFallback className="bg-primary font-semibold text-white">
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
    {
      accessorKey: "role",
      header: () => <span className={headerClassName}>Role</span>,
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground/80">
          {roleLabels[row.original.role]}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: () => <span className={headerClassName}>Status</span>,
      cell: ({ row }) => (
        <div className="max-w-48">
          <Badge
            variant={
              row.original.status === "active" ? "secondary" : "destructive"
            }
            className="capitalize"
          >
            {row.original.status}
          </Badge>
          {row.original.suspensionReason ? (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {row.original.suspensionReason}
            </p>
          ) : null}
        </div>
      ),
    },
    ...(category === "personnel"
      ? [
          {
            id: "lastSignIn",
            header: () => <span className={headerClassName}>Last sign-in</span>,
            cell: ({ row }) => (
              <LastSignInCell account={row.original} />
            ),
          } satisfies ColumnDef<AccountSummary>,
        ]
      : []),
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={`${headerClassName} -ml-3 h-8 hover:bg-transparent hover:text-foreground`}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="size-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
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
        </div>
      ),
    },
  ];
}
