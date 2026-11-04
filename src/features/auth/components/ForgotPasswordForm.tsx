import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { AlertCircleIcon, Mail } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Button } from "~/components/ui/button";
import { staggerStyle } from "~/components/motion/stagger";
import { useForgotPassword } from "../hooks/useForgotPassword";
import { useVerifyRecoveryOtp } from "../hooks/useVerifyRecoveryOtp";
import { useInvisibleCaptcha } from "../hooks/useInvisibleCaptcha";
import { InvisibleCaptcha, RecaptchaNotice } from "./InvisibleCaptcha";
import { RECOVERY_CONFIRMATION, RECOVERY_RESEND_SECONDS } from "../recovery";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { OtpCodeForm } from "./OtpCodeForm";
import {
  authStepLabelClass,
  AuthBackLink,
  AuthCenteredLayout,
  AuthStepHeading,
} from "./AuthSplitLayout";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

const ForgotPasswordForm = () => {
  const forgotPasswordMutation = useForgotPassword();
  const verifyOtpMutation = useVerifyRecoveryOtp();
  const result = forgotPasswordMutation.data;
  const captcha = useInvisibleCaptcha();
  const inFlight = useRef(false);
  // A server-reported failure still resolves the mutation, so "success" alone
  // would show the code-entry step for a request that never sent anything.
  const [codeSent, setCodeSent] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RECOVERY_RESEND_SECONDS);
  const requestError = result?.error
    ? result.message
    : forgotPasswordMutation.status === "error"
      ? "We could not reach the email service. Please try again in a moment."
      : null;
  const otpError = verifyOtpMutation.data?.error
    ? verifyOtpMutation.data.message
    : verifyOtpMutation.status === "error"
      ? "We could not reach the account service. Please try again in a moment."
      : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
    },
  });

  const email = form.watch("email");

  async function onSubmit(data: FormValues) {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await captcha.execute(async token => {
        const response = await forgotPasswordMutation.mutate({
          data: { email: data.email, "g-recaptcha-response": token },
        });
        if (response && !response.error) {
          setCodeSent(true);
          setCodeInvalid(false);
          setResendSeconds(response.retryAfterSeconds ?? RECOVERY_RESEND_SECONDS);
        }
      });
    } finally { inFlight.current = false; }
  }

  return (
    <AuthCenteredLayout>
      <div className="flex flex-col gap-6">
        <AuthBackLink to="/login">Back</AuthBackLink>

        {codeSent ? (
          <>
            <AuthStepHeading title="Check your email">
              {RECOVERY_CONFIRMATION}
            </AuthStepHeading>

            <div className="civic-enter-scale">
              {requestError && <Alert variant="destructive"><AlertDescription>{requestError}</AlertDescription></Alert>}
              <OtpCodeForm
                isVerifying={verifyOtpMutation.status === "pending"}
                isResending={captcha.busy || !captcha.ready || forgotPasswordMutation.status === "pending"}
                errorMessage={otpError}
                codeInvalid={codeInvalid}
                minCodeLength={8}
                resendCooldownSeconds={resendSeconds}
                resendLabel="Resend code"
                onVerify={async (token) => {
                  const response = await verifyOtpMutation.mutate({ data: { email, token } });
                  setCodeInvalid(!!(response && "codeInvalid" in response && response.codeInvalid));
                }}
                onResend={() => { void onSubmit({ email }); }}
              />
              <RecaptchaNotice />
            </div>
          </>
        ) : (
          <>
            <AuthStepHeading title="Forgot your password?">
              Enter your email address and we&apos;ll send you a code to reset
              your password.
            </AuthStepHeading>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
            >
              {requestError && (
                <Alert variant="destructive" className="civic-enter-sm">
                  <AlertCircleIcon />
                  <AlertTitle>Reset code not sent</AlertTitle>
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              )}

              <FieldGroup className="civic-stagger gap-5">
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                      style={staggerStyle(0)}
                      className="gap-1.75"
                    >
                      <FieldLabel
                        htmlFor="email"
                        className={authStepLabelClass}
                      >
                        Email address
                      </FieldLabel>
                      <InputGroup fieldSize="touch" shape="split">
                        <InputGroupAddon>
                          <Mail size={16} aria-hidden="true" />
                        </InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          id="email"
                          placeholder="juan.delacruz@email.com"
                          aria-invalid={fieldState.invalid}
                          autoComplete="email"
                          autoFocus
                        />
                      </InputGroup>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Button
                  type="submit"
                  data-size="invisible"
                  size="touch"
                  shape="split"
                  style={staggerStyle(1)}
                  disabled={!captcha.ready || captcha.busy || forgotPasswordMutation.status === "pending"}
                >
                  {captcha.busy || forgotPasswordMutation.status === "pending" ? (
                    <>
                      <Spinner />
                      Sending
                    </>
                  ) : (
                    "Send reset code"
                  )}
                </Button>
                <RecaptchaNotice />
              </FieldGroup>
            </form>
          </>
        )}
        <InvisibleCaptcha captcha={captcha} />
      </div>
    </AuthCenteredLayout>
  );
};

export default ForgotPasswordForm;
