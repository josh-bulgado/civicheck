import { useEffect, useState, type FormEvent } from "react";
import { AlertCircleIcon } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";
import { authButtonClass, authStepLabelClass } from "./AuthSplitLayout";

// Supabase's OTP length is a project-level setting (Authentication → Sign In /
// Providers → Email OTP Length), not something this app controls. The field
// draws OTP_LENGTH cells to match the project's current setting, but confirming
// only needs MIN_CODE_LENGTH digits so a shorter code is never locked out —
// the server is the judge of whether it is right.
const OTP_LENGTH = 8;
const MIN_CODE_LENGTH = 6;
const CELLS_PER_GROUP = OTP_LENGTH / 2;
const RESEND_COOLDOWN_SECONDS = 30;

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Two runs of cells with a wider gap between them, so a long code reads in
// halves — the same split the code has in the email.
const cellGroups = [0, 1].map((group) =>
  Array.from(
    { length: CELLS_PER_GROUP },
    (_, cell) => group * CELLS_PER_GROUP + cell,
  ),
);

/** The email shows the code as "6628 1551"; copying it carries the space along. */
function digitsOnly(text: string) {
  return text.replace(/\D/g, "");
}

/**
 * Shared code-entry step for the OTP-based auth flows (signup confirmation,
 * password recovery). A fresh code invalidates the previous one, so the
 * resend cooldown exists to stop an accidental double-send from orphaning
 * the code the applicant is about to type in.
 */
export function OtpCodeForm({
  isVerifying,
  isResending,
  errorMessage,
  onVerify,
  onResend,
  submitLabel = "Verify code",
}: {
  isVerifying: boolean;
  isResending: boolean;
  /** Why the last code was refused, if it was. Shown only while the field
   * still holds that code. */
  errorMessage?: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  submitLabel?: string;
}) {
  const [code, setCode] = useState("");
  // The code the last attempt was made with: a rejection belongs to that code,
  // so it stops showing the moment the applicant edits it.
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const shownError =
    errorMessage && !isVerifying && submittedCode === code
      ? errorMessage
      : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isVerifying || isResending || code.length < MIN_CODE_LENGTH) return;
    setSubmittedCode(code);
    onVerify(code);
  }

  function handleResend() {
    setCode("");
    setSubmittedCode(null);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    onResend();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field className="gap-2">
        <FieldLabel htmlFor="otp" className={authStepLabelClass}>
          Verification code
        </FieldLabel>
        <InputOTP
          id="otp"
          maxLength={OTP_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          pasteTransformer={digitsOnly}
          value={code}
          onChange={setCode}
          containerClassName="w-full gap-3"
          aria-invalid={shownError !== null}
          aria-describedby={shownError ? "otp-error" : undefined}
          autoFocus
        >
          {cellGroups.map((cells, group) => (
            <InputOTPGroup key={group}>
              {cells.map((index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  size="lg"
                  shape="pill"
                  aria-invalid={shownError !== null}
                />
              ))}
            </InputOTPGroup>
          ))}
        </InputOTP>
        {shownError && (
          <p
            id="otp-error"
            role="alert"
            className="civic-enter-sm flex items-center gap-1.5 text-xs text-destructive"
          >
            <AlertCircleIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {shownError}
          </p>
        )}
      </Field>

      <Button
        type="submit"
        className={cn(
          authButtonClass,
          "rounded-full",
          !isVerifying &&
            "disabled:bg-border-light disabled:text-disabled disabled:opacity-100",
        )}
        disabled={isVerifying || isResending || code.length < MIN_CODE_LENGTH}
      >
        {isVerifying ? (
          <>
            <Spinner />
            Verifying
          </>
        ) : (
          submitLabel
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-[13px] text-muted-2">
        <span>Didn&apos;t get a code?</span>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={handleResend}
          disabled={isResending || cooldown > 0}
        >
          {isResending
            ? "Resending…"
            : cooldown > 0
              ? `Resend in ${formatCountdown(cooldown)}`
              : "Resend"}
        </Button>
      </div>
    </form>
  );
}
