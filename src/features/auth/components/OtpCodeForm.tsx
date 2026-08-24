import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { authButtonClass, authLabelClass } from "./AuthSplitLayout";

// Supabase's OTP length is a project-level setting (Authentication → Sign In /
// Providers → Email OTP Length), not something this app controls, so the
// field can't assume a fixed digit count — it accepts whatever the project is
// configured to send and lets the server be the judge of validity.
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 12;
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Shared code-entry step for the OTP-based auth flows (signup confirmation,
 * password recovery). A fresh code invalidates the previous one, so the
 * resend cooldown exists to stop an accidental double-send from orphaning
 * the code the applicant is about to type in.
 */
export function OtpCodeForm({
  description,
  isVerifying,
  isResending,
  errorMessage,
  onVerify,
  onResend,
  submitLabel = "Verify code",
}: {
  description?: ReactNode;
  isVerifying: boolean;
  isResending: boolean;
  errorMessage?: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  submitLabel?: string;
}) {
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.length >= MIN_CODE_LENGTH) onVerify(code);
  }

  function handleResend() {
    setCode("");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    onResend();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {description && (
        <p className="text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="civic-enter-sm">
          <AlertCircleIcon />
          <AlertTitle>Verification failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Field className="gap-1.75">
        <FieldLabel htmlFor="otp" className={authLabelClass}>
          Verification code
        </FieldLabel>
        <Input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={MAX_CODE_LENGTH}
          placeholder="Enter code"
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value.replace(/\D/g, "").slice(0, MAX_CODE_LENGTH),
            )
          }
          className="h-13 rounded-lg text-center text-2xl font-semibold tracking-[0.3em] shadow-none placeholder:text-base placeholder:tracking-normal"
          autoFocus
        />
      </Field>

      <Button
        type="submit"
        className={authButtonClass}
        disabled={isVerifying || code.length < MIN_CODE_LENGTH}
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

      <div className="flex items-center justify-center gap-1 text-[13px] text-muted-2">
        <span>Didn&apos;t get a code?</span>
        <Button
          type="button"
          variant="link"
          size="xs"
          onClick={handleResend}
          disabled={isResending || cooldown > 0}
        >
          {isResending
            ? "Resending…"
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend"}
        </Button>
      </div>
    </form>
  );
}
