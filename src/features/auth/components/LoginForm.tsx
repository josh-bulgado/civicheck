import { JSX, SVGProps, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

import { AlertCircleIcon } from "lucide-react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { staggerStyle } from "~/components/motion/stagger";
import { useLogin } from "~/features/auth/hooks/useLogin";
import { useOAuthLogin } from "~/features/auth/hooks/useOAuthLogin";
import { useVerifySignupOtp } from "~/features/auth/hooks/useVerifySignupOtp";
import { useResendSignupOtp } from "~/features/auth/hooks/useResendSignupOtp";
import { VerifyEmailNotice } from "./VerifyEmailNotice";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupInput } from "~/components/ui/input-group";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AuthEmblemPanel } from "./AuthSidePanel";
import {
  authButtonClass,
  authFieldClass,
  authLabelClass,
  authLinkClass,
  AuthFormFooter,
  AuthFormHeading,
  AuthSplitLayout,
} from "./AuthSplitLayout";
import { PasswordToggle } from "./PasswordToggle";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

const INVALID_CREDENTIALS =
  "Invalid email or password. Please check your credentials and try again.";

/** Keeps the applicant on this page with a readable reason for every failure. */
function describeSignInError(
  result: { error?: boolean; message?: string } | undefined,
  requestFailed: boolean,
) {
  if (requestFailed) {
    return "We could not reach the sign-in service. Please check your connection and try again.";
  }
  if (!result?.error) {
    return null;
  }

  const message = result.message ?? "";
  if (!message || /invalid login credentials/i.test(message)) {
    return INVALID_CREDENTIALS;
  }
  if (/email not confirmed/i.test(message)) {
    return "Please confirm your email address first — check your inbox for the verification code.";
  }
  return message;
}

const GoogleIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

export function LoginForm({
  redirect: redirectTo,
  error,
}: {
  redirect?: string;
  error?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const loginMutation = useLogin(redirectTo);
  const oauthLoginMutation = useOAuthLogin();
  const verifyOtpMutation = useVerifySignupOtp();
  const resendOtpMutation = useResendSignupOtp();
  // Set when a sign-in attempt fails specifically because the account was
  // never confirmed — the credentials themselves were correct, so this skips
  // straight to a fresh code instead of sending the applicant back to their
  // inbox to dig up (or request again) whatever the signup flow originally sent.
  const [unconfirmed, setUnconfirmed] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: FormValues) {
    const result = await loginMutation.mutate({ data });
    if (result?.error && /email not confirmed/i.test(result.message ?? "")) {
      setUnconfirmed({ email: data.email, password: data.password });
      resendOtpMutation.mutate({ data });
    }
  }

  const signInError = describeSignInError(
    loginMutation.data,
    loginMutation.status === "error",
  );

  const otpError = verifyOtpMutation.data?.error
    ? verifyOtpMutation.data.message
    : verifyOtpMutation.status === "error"
      ? "We could not reach the account service. Please try again in a moment."
      : null;

  return (
    <AuthSplitLayout panel={<AuthEmblemPanel />}>
      <VerifyEmailNotice
        open={unconfirmed !== null}
        email={unconfirmed?.email ?? ""}
        isVerifying={verifyOtpMutation.status === "pending"}
        isResending={resendOtpMutation.status === "pending"}
        errorMessage={otpError}
        onVerify={(token) => {
          if (!unconfirmed) return;
          verifyOtpMutation.mutate({ data: { email: unconfirmed.email, token } });
        }}
        onResend={() => {
          if (!unconfirmed) return;
          resendOtpMutation.mutate({ data: unconfirmed });
        }}
        onUseDifferentEmail={() => setUnconfirmed(null)}
        dismissLabel="Wrong account? Try again"
      />

      <div className="flex flex-col gap-7">
        <AuthFormHeading
          title="Welcome back"
          description="Please enter your details"
          className="text-[34px] font-extrabold"
        />

        {signInError && (
          <Alert variant="destructive" className="civic-enter-sm">
            <AlertCircleIcon />
            <AlertTitle>Sign in failed</AlertTitle>
            <AlertDescription>{signInError}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="civic-enter-sm">
            <AlertCircleIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="civic-stagger gap-4">
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  style={staggerStyle(0)}
                  className="gap-1.75"
                >
                  <FieldLabel htmlFor="email" className={authLabelClass}>
                    Email address
                  </FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    className={authFieldClass}
                    placeholder="juan.delacruz@email.com"
                    aria-invalid={fieldState.invalid}
                    autoComplete="email"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  style={staggerStyle(1)}
                  className="gap-1.75"
                >
                  <FieldLabel htmlFor="password" className={authLabelClass}>
                    Password
                  </FieldLabel>
                  <InputGroup className={authFieldClass}>
                    <InputGroupInput
                      {...field}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="px-3.5"
                      placeholder="Enter your password"
                      aria-invalid={fieldState.invalid}
                      autoComplete="current-password"
                    />
                    <PasswordToggle
                      shown={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                    />
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Session length and the recovery route are the two decisions left
                before submitting, so they share one line under the fields. */}
            <div
              style={staggerStyle(2)}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-0.5"
            >
              <label className="flex items-center gap-2.5 text-[13.5px] text-body">
                <Checkbox
                  checked={keepSignedIn}
                  onCheckedChange={(checked) => setKeepSignedIn(checked === true)}
                />
                Keep me signed in
              </label>

              <Link to="/forgot-password" className={authLinkClass}>
                Forgot password
              </Link>
            </div>

            <div style={staggerStyle(3)} className="flex flex-col gap-3">
              <Button
                type="submit"
                className={authButtonClass}
                disabled={loginMutation.status === "pending"}
              >
                {loginMutation.status === "pending" ? (
                  <>
                    <Spinner />
                    Signing in
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              <Button
                variant="outline"
                className={`${authButtonClass} justify-center gap-2.5 text-sm font-medium`}
                onClick={() => oauthLoginMutation.mutate({ provider: "google" })}
                disabled={oauthLoginMutation.status === "pending"}
              >
                <GoogleIcon className="size-4.5" />
                Sign in with Google
              </Button>
            </div>
          </FieldGroup>
        </form>

        <AuthFormFooter>
          Don&apos;t have an account?
          <Link to="/signup" className={authLinkClass}>
            Sign up
          </Link>
        </AuthFormFooter>
      </div>
    </AuthSplitLayout>
  );
}
