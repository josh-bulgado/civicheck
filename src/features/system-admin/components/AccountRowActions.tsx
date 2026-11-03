import {
  History,
  KeyRound,
  Lock,
  LogOut,
  MailCheck,
  MoreHorizontal,
  RotateCcw,
  SquarePen,
  UserRoundX,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { AccountSummary } from "../system-admin.types";

/** What a row can ask the table to do; the table owns the dialogs behind each. */
export type AccountActionHandlers = {
  onEdit: (account: AccountSummary) => void;
  onSuspend: (account: AccountSummary) => void;
  onReactivate: (account: AccountSummary) => void;
  onViewHistory: (account: AccountSummary) => void;
  onSendPasswordReset: (account: AccountSummary) => void;
  onResendVerification: (account: AccountSummary) => void;
  onRevokeSessions: (account: AccountSummary) => void;
};

export function AccountRowActions({
  account,
  isPending,
  onEdit,
  onSuspend,
  onReactivate,
  onViewHistory,
  onSendPasswordReset,
  onResendVerification,
  onRevokeSessions,
}: {
  account: AccountSummary;
  isPending: boolean;
} & AccountActionHandlers) {
  if (account.role === "system_admin") {
    return (
      <span className="inline-flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
        <Lock aria-hidden="true" className="size-3.5" />
        Protected
      </span>
    );
  }

  const isActive = account.status === "active";
  const canEdit = account.role !== "applicant";
  // A pending invitation belongs to the CCRO Administrator (resend/cancel), and
  // a reset or verification link would let the invitee skip accepting it.
  const canSendLinks = isActive && !account.invitePending;

  return (
    <div className="flex items-center justify-end gap-2">
      {!isActive ? (
        <Button
          variant="outline"
          shape="pill"
          disabled={isPending}
          onClick={() => onReactivate(account)}
          className="gap-1.5 bg-card px-3 shadow-none"
        >
          <RotateCcw aria-hidden="true" data-icon="inline-start" />
          Reactivate
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              className="rounded-full text-muted-foreground data-open:bg-muted"
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
          <span className="sr-only">
            More actions for {account.firstName} {account.lastName}
          </span>
        </DropdownMenuTrigger>
        {/* The menu defaults to the trigger's width, which is the icon button
            here, so it sizes to its longest item instead. */}
        <DropdownMenuContent
          align="end"
          variant="roomy"
          className="w-max whitespace-nowrap"
        >
          <DropdownMenuItem onClick={() => onViewHistory(account)}>
            <History />
            Account history
          </DropdownMenuItem>
          {canEdit ? (
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => onEdit(account)}
            >
              <SquarePen />
              Edit details
            </DropdownMenuItem>
          ) : null}
          {isActive ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Sign-in help</DropdownMenuLabel>
                {canSendLinks ? (
                  <DropdownMenuItem
                    disabled={isPending}
                    onClick={() => onSendPasswordReset(account)}
                  >
                    <KeyRound />
                    Send password reset link
                  </DropdownMenuItem>
                ) : null}
                {canSendLinks && !account.emailConfirmed ? (
                  <DropdownMenuItem
                    disabled={isPending}
                    onClick={() => onResendVerification(account)}
                  >
                    <MailCheck />
                    Resend verification email
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => onRevokeSessions(account)}
                >
                  <LogOut />
                  Sign out all sessions
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Access</DropdownMenuLabel>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => onSuspend(account)}
                >
                  <UserRoundX />
                  Suspend account
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
