import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import type { AccountSummary } from "../system-admin.types";

function SuspendAccountForm({
  account,
  isPending,
  onClose,
  onConfirm,
}: {
  account: AccountSummary;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("");

  async function handleConfirm() {
    if (await onConfirm(reason.trim())) onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Suspend account?</DialogTitle>
        <DialogDescription>
          {account.email} will lose access immediately. The reason is required
          and will be retained in the audit history.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="suspension-reason">Reason</Label>
        <Textarea
          id="suspension-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this account is being suspended"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={isPending} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={isPending || reason.trim().length < 10}
          onClick={() => void handleConfirm()}
        >
          {isPending ? (
            <>
              <Spinner />
              Suspending
            </>
          ) : (
            "Suspend account"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export function SuspendAccountDialog({
  account,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  account: AccountSummary | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<boolean>;
}) {
  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {account ? (
          <SuspendAccountForm
            key={account.id}
            account={account}
            isPending={isPending}
            onClose={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
