import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { AlertCircleIcon } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";
import { staggerStyle } from "~/components/motion/stagger";
import { authStepLabelClass } from "./AuthSplitLayout";

// Supabase's OTP length is a project-level setting (Authentication → Sign In /
// Providers → Email OTP Length), not something this app controls. The field
// draws OTP_LENGTH cells to match the project's current setting, but confirming
// only needs MIN_CODE_LENGTH digits so a shorter code is never locked out —
// the server is the judge of whether it is right.
const OTP_LENGTH = 8;
const MIN_CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const cells = Array.from({ length: OTP_LENGTH }, (_, index) => index);

/** Accept a copied code even when the email client includes spaces. */
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
  resendCooldownSeconds = RESEND_COOLDOWN_SECONDS,
  resendLabel = "Resend code",
  description = "Enter the 8-digit code sent to your email.",
  minCodeLength = MIN_CODE_LENGTH,
  codeInvalid = false,
  autoSubmitOnPaste = false,
}: {
  isVerifying: boolean;
  isResending: boolean;
  /** Why the last code was refused, if it was. Shown only while the field
   * still holds that code. */
  errorMessage?: string | null;
  onVerify: (code: string) => void | Promise<unknown>;
  onResend: () => void;
  submitLabel?: string;
  resendCooldownSeconds?: number;
  resendLabel?: string;
  description?: string;
  minCodeLength?: number;
  codeInvalid?: boolean;
  /** Only an explicit paste of a complete code triggers a server check. */
  autoSubmitOnPaste?: boolean;
}) {
  const [code, setCode] = useState("");
  // The code the last attempt was made with: a rejection belongs to that code,
  // so it stops showing the moment the applicant edits it.
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(resendCooldownSeconds);
  const submissionInFlight = useRef(false);

  useEffect(() => { setCooldown(resendCooldownSeconds); }, [resendCooldownSeconds]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const shownError =
    errorMessage && !isVerifying && (codeInvalid || submittedCode === code)
      ? errorMessage
      : null;

  async function verifyCode(nextCode: string) {
    // The ref also blocks two events in the same render, before the parent
    // mutation has painted its pending state.
    if (submissionInFlight.current || isVerifying || isResending || codeInvalid || nextCode.length < minCodeLength) return;
    submissionInFlight.current = true;
    setSubmittedCode(nextCode);
    try {
      await onVerify(nextCode);
    } finally {
      submissionInFlight.current = false;
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void verifyCode(code);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    if (!autoSubmitOnPaste) return;
    const pasted = event.clipboardData.getData("text").trim();
    // Accept common code separators, but never auto-submit a partial code,
    // truncated longer number, or digits extracted from a whole email.
    if (!/^[\d\s-]+$/.test(pasted)) return;
    const nextCode = digitsOnly(pasted);
    if (nextCode.length !== OTP_LENGTH) return;
    event.preventDefault();
    event.stopPropagation();
    if (submissionInFlight.current || isVerifying || isResending || codeInvalid) return;
    setCode(nextCode);
    void verifyCode(nextCode);
  }

  function handleResend() {
    if (submissionInFlight.current || isVerifying || isResending || cooldown > 0) return;
    setCode("");
    setSubmittedCode(null);
    setCooldown(resendCooldownSeconds);
    onResend();
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isVerifying || isResending}
      data-verifying={isVerifying || undefined}
      className="civic-otp-form flex flex-col gap-4"
    >
      <Field className="gap-2">
        <FieldLabel htmlFor="otp" className={authStepLabelClass}>
          Verification code
        </FieldLabel>
        <FieldDescription id="otp-description" className="text-xs">
          {description}
        </FieldDescription>
        <InputOTP
          id="otp"
          maxLength={OTP_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          pasteTransformer={digitsOnly}
          value={code}
          onChange={setCode}
          onPasteCapture={handlePaste}
          autoComplete="one-time-code"
          inputMode="numeric"
          containerClassName="w-full"
          aria-invalid={shownError !== null}
          aria-describedby={shownError ? "otp-description otp-error" : "otp-description"}
          autoFocus
          disabled={codeInvalid}
          readOnly={isVerifying || isResending}
        >
          <InputOTPGroup className={cn("gap-2", shownError && "civic-otp-rejected")}>
            {cells.map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                size="lg"
                shape="default"
                className="civic-otp-slot"
                data-filled={index < code.length || undefined}
                style={staggerStyle(index)}
                aria-invalid={shownError !== null}
              />
            ))}
          </InputOTPGroup>
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
        size="touch"
        shape="default"
        className={cn(
          "w-full font-semibold disabled:opacity-100",
          !isVerifying &&
            "disabled:bg-border-light disabled:text-disabled",
        )}
        disabled={isVerifying || isResending || codeInvalid || code.length < minCodeLength}
      >
        {isVerifying ? (
          <>
            <Spinner className="motion-reduce:animate-none" />
            Verifying
          </>
        ) : (
          submitLabel
        )}
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-center text-[13px] text-muted-2">
        <span>Didn&apos;t get a code?</span>
        <Button
          type="button"
          variant="link"
          size="touch"
          shape="default"
          className="px-0 text-[13px] disabled:text-muted-2 disabled:opacity-100"
          onClick={handleResend}
          disabled={isVerifying || isResending || cooldown > 0}
        >
          {isResending
            ? "Resending…"
            : cooldown > 0
              ? `${resendLabel} in ${formatCountdown(cooldown)}`
              : resendLabel}
        </Button>
      </div>
    </form>
  );
}
