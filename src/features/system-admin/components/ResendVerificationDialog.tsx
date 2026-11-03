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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import type { AccountSummary } from "../system-admin.types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ResendVerificationForm({
  account,
  isPending,
  onClose,
  onConfirm,
}: {
  account: AccountSummary;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (email: string) => Promise<boolean>;
}) {
  const [email, setEmail] = useState(account.email);
  const normalized = email.trim().toLowerCase();
  const emailChanged = normalized !== account.email.toLowerCase();

  async function handleConfirm() {
    if (await onConfirm(normalized)) onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Resend verification email</DialogTitle>
        <DialogDescription>
          This address has not been verified yet. If the resident mistyped it,
          correct it below — the new address is verified by the link we send
          to it.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="verification-email">Email address</Label>
        <Input
          id="verification-email"
          type="email"
          autoComplete="off"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {emailChanged ? (
          <p className="text-xs text-muted-foreground">
            The account&apos;s email will change from {account.email} to{" "}
            {normalized || "…"}.
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={isPending} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={isPending || !EMAIL_PATTERN.test(normalized)}
          onClick={() => void handleConfirm()}
        >
          {isPending ? (
            <>
              <Spinner />
              Sending
            </>
          ) : emailChanged ? (
            "Update email & send"
          ) : (
            "Send verification email"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ResendVerificationDialog({
  account,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  account: AccountSummary | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (account: AccountSummary, email: string) => Promise<boolean>;
}) {
  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {account ? (
          <ResendVerificationForm
            key={account.id}
            account={account}
            isPending={isPending}
            onClose={() => onOpenChange(false)}
            onConfirm={(email) => onConfirm(account, email)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
