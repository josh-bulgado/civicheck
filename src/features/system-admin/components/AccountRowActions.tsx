import {
  History,
  KeyRound,
  LogOut,
  MailCheck,
  MoreHorizontal,
  RotateCcw,
  SquarePen,
  UserRoundX,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { AccountSummary } from "../system-admin.types";

/** Icon-only button; the tooltip and aria-label carry the action's name. */
function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

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
  onEdit: (account: AccountSummary) => void;
  onSuspend: (account: AccountSummary) => void;
  onReactivate: (account: AccountSummary) => void;
  onViewHistory: (account: AccountSummary) => void;
  onSendPasswordReset: (account: AccountSummary) => void;
  onResendVerification: (account: AccountSummary) => void;
  onRevokeSessions: (account: AccountSummary) => void;
}) {
  if (account.role === "system_admin") {
    return <span className="text-xs text-muted-foreground">Protected</span>;
  }

  const isActive = account.status === "active";
  // A pending invitation belongs to the CCRO Administrator (resend/cancel), and
  // a reset or verification link would let the invitee skip accepting it.
  const canSendLinks = isActive && !account.invitePending;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {account.role === "applicant" ? null : (
        <IconAction
          label="Edit details"
          disabled={isPending}
          onClick={() => onEdit(account)}
        >
          <SquarePen />
        </IconAction>
      )}
      {isActive ? (
        <IconAction
          label="Suspend account"
          disabled={isPending}
          onClick={() => onSuspend(account)}
        >
          <UserRoundX />
        </IconAction>
      ) : (
        <IconAction
          label="Reactivate account"
          disabled={isPending}
          onClick={() => onReactivate(account)}
        >
          <RotateCcw />
        </IconAction>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground data-open:bg-muted"
            />
          }
        >
          <MoreHorizontal />
          <span className="sr-only">
            More actions for {account.firstName} {account.lastName}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => onViewHistory(account)}>
            <History />
            Account history
          </DropdownMenuItem>
          {canSendLinks || isActive ? <DropdownMenuSeparator /> : null}
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
          {isActive ? (
            <DropdownMenuItem
              variant="destructive"
              disabled={isPending}
              onClick={() => onRevokeSessions(account)}
            >
              <LogOut />
              Sign out all sessions
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
