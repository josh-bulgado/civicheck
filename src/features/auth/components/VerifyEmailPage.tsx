import { useEffect, useRef, useState } from "react";
import { Navigate } from "@tanstack/react-router";
import { useResendSignupOtp } from "../hooks/useResendSignupOtp";
import { useSignUp } from "../hooks/useSignUp";
import { useVerifySignupOtp } from "../hooks/useVerifySignupOtp";
import { getPendingVerification } from "../pending-verification";
import {
  AuthBackLink,
  AuthCenteredLayout,
  AuthEmphasis,
  AuthStepHeading,
} from "./AuthSplitLayout";
import { OtpCodeForm } from "./OtpCodeForm";

/**
 * Code-entry step that follows creating an account (or signing in to one that
 * was never confirmed). It is its own page rather than a dialog so the code
 * can be read off an email in another tab without the form sitting on top of
 * everything else.
 */
export function VerifyEmailPage() {
  // The route's guard guarantees this is set. Reading it once keeps the page
  // stable while the route clears it on the way out.
  const [pending] = useState(getPendingVerification);
  const verifyOtpMutation = useVerifySignupOtp();
  const signupMutation = useSignUp();
  const resendOtpMutation = useResendSignupOtp();
  const { mutate: resendCode } = resendOtpMutation;
  const codeRequested = useRef(false);

  useEffect(() => {
    if (!pending?.sendCodeOnArrival || codeRequested.current) return;
    // A repeated effect must not replace the code that was just emailed.
    codeRequested.current = true;
    void resendCode({
      data: { email: pending.email, password: pending.password },
    });
  }, [pending, resendCode]);

  if (!pending) return <Navigate to="/login" />;

  const { email, password, signup } = pending;
  const isResending =
    (signup ? signupMutation : resendOtpMutation).status === "pending" ||
    (pending.sendCodeOnArrival === true && resendOtpMutation.status === "idle");
  const rejection = verifyOtpMutation.data?.error
    ? verifyOtpMutation.data.message
    : verifyOtpMutation.status === "error"
      ? "We could not reach the account service. Please try again in a moment."
      : null;

  return (
    <AuthCenteredLayout>
      <div className="flex flex-col gap-6">
        <AuthBackLink to="/login">Back to sign in</AuthBackLink>

        <AuthStepHeading title="Check your email">
          We&apos;ve sent a verification code to{" "}
          <AuthEmphasis>{email}</AuthEmphasis>. Enter it below to confirm your
          account.
        </AuthStepHeading>

        {resendOtpMutation.status === "error" && (
          <p role="alert" className="text-sm text-destructive">
            We could not send your code. Please check your connection and try
            Resend again.
          </p>
        )}

        <OtpCodeForm
          isVerifying={verifyOtpMutation.status === "pending"}
          isResending={isResending}
          errorMessage={rejection}
          onVerify={(token) =>
            verifyOtpMutation.mutate({ data: { email, token } })
          }
          onResend={() => {
            // Re-running the signup is what mints a fresh code for an account
            // created a moment ago; an existing one goes through its credentials.
            if (signup) {
              signupMutation.mutate({ data: signup });
            } else {
              resendOtpMutation.mutate({ data: { email, password } });
            }
          }}
          submitLabel="Confirm account"
        />
      </div>
    </AuthCenteredLayout>
  );
}
