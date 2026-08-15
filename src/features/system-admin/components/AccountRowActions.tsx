import { RotateCcw, UserRoundX } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { AccountSummary } from "../system-admin.types";

export function AccountRowActions({
  account,
  isPending,
  onSuspend,
  onReactivate,
}: {
  account: AccountSummary;
  isPending: boolean;
  onSuspend: (account: AccountSummary) => void;
  onReactivate: (account: AccountSummary) => void;
}) {
  if (account.role === "system_admin") {
    return <span className="text-xs text-muted-foreground">Protected</span>;
  }

  return account.status === "active" ? (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => onSuspend(account)}
    >
      <UserRoundX />
      Suspend
    </Button>
  ) : (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => onReactivate(account)}
    >
      <RotateCcw />
      Reactivate
    </Button>
  );
}
