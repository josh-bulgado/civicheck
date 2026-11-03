import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import type { AccountSummary } from "../system-admin.types";

export type AccountConfirmCopy = {
  title: string;
  description: (account: AccountSummary) => ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  destructive?: boolean;
};

/**
 * One-step confirmation for account actions that need no further input, such
 * as sending a password reset link or signing an account out everywhere.
 */
export function AccountConfirmDialog({
  account,
  copy,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  account: AccountSummary | null;
  copy: AccountConfirmCopy;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (account: AccountSummary) => Promise<boolean>;
}) {
  async function handleConfirm() {
    if (account && (await onConfirm(account))) onOpenChange(false);
  }

  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {account ? copy.description(account) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant={copy.destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={() => void handleConfirm()}
          >
            {isPending ? (
              <>
                <Spinner />
                {copy.pendingLabel}
              </>
            ) : (
              copy.confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
