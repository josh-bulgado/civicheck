import { MailCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { OtpCodeForm } from "./OtpCodeForm";
import { Button } from "~/components/ui/button";

export function VerifyEmailNotice({
  open,
  email,
  isVerifying,
  isResending,
  errorMessage,
  onVerify,
  onResend,
  onUseDifferentEmail,
  dismissLabel = "Used the wrong email? Sign up again",
}: {
  open: boolean;
  email: string;
  isVerifying: boolean;
  isResending: boolean;
  errorMessage?: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  onUseDifferentEmail: () => void;
  /** Text for the dismiss link — the signup and login entry points into this
   * dialog want different framing for "never mind, close this". */
  dismissLabel?: string;
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
              We've sent a verification code to {email}. Enter it below to
              confirm your account.
            </DialogDescription>
          </div>
        </div>

        <OtpCodeForm
          isVerifying={isVerifying}
          isResending={isResending}
          errorMessage={errorMessage}
          onVerify={onVerify}
          onResend={onResend}
          submitLabel="Confirm account"
        />

        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onUseDifferentEmail}
          className="self-center"
        >
          {dismissLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
