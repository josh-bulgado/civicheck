import { Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { authButtonClass } from "./AuthSplitLayout";

export function VerifyEmailNotice({
  open,
  onUseDifferentEmail,
}: {
  open: boolean;
  onUseDifferentEmail: () => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-soft">
            <MailCheck className="size-6 text-success" aria-hidden="true" />
          </span>

          <div className="flex flex-col gap-1.5">
            <DialogTitle className="civic-title text-[22px] leading-[1.15] font-normal">
              Check your email
            </DialogTitle>
            <DialogDescription className="text-sm leading-snug text-muted-2">
              We have sent you a verification link.
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border-light bg-surface-subtle p-4 text-[13px] leading-snug text-muted-2">
          <p>Didn&apos;t get it? Please check your spam folder.</p>
        </div>

        <Button className={authButtonClass} render={<Link to="/login" />}>
          Go to sign in
        </Button>

        <button
          type="button"
          onClick={onUseDifferentEmail}
          className="self-center text-[13px] font-semibold text-muted-2 underline underline-offset-2 hover:text-body"
        >
          Used the wrong email? Sign up again
        </button>
      </DialogContent>
    </Dialog>
  );
}
