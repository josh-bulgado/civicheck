import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { QuietLink as Link } from "~/components/quiet-link";
import { Button } from "~/components/ui/button";

import { AlertCircleIcon, Eye, EyeOff, Lock, Mail } from "lucide-react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { staggerStyle } from "~/components/motion/stagger";
import { useLogin } from "~/features/auth/hooks/useLogin";
import { useOAuthLogin } from "~/features/auth/hooks/useOAuthLogin";
import { useAuthLockout } from "~/features/auth/hooks/useAuthLockout";
import { useCaptcha } from "~/features/auth/hooks/useCaptcha";
import { Captcha } from "./Captcha";
import { setPendingVerification } from "~/features/auth/pending-verification";
import { PERSISTENT_SESSION_MAX_AGE_SECONDS } from "~/features/auth/session-scope";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/ui/spinner";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { GoogleIcon } from "./GoogleIcon";
import { LoginLayout } from "./LoginLayout";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

const INVALID_CREDENTIALS = "Wrong Email and Password";

// Read from the cookie policy, so the sentence under the checkbox cannot drift
// from what the cookies actually do.
const KEEP_SIGNED_IN_DAYS = Math.round(
  PERSISTENT_SESSION_MAX_AGE_SECONDS / (24 * 60 * 60),
);

/** Only actual sign-in failures belong on this page; verification has its own step. */
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
    return null;
  }
  return message;
}

export function LoginForm({
  redirect: redirectTo,
  error,
  lockedUntil,
}: {
  redirect?: string;
  error?: string;
  lockedUntil?: number;
}) {
  const [showPassword, setShowPassword] = useState(false);
  // Opt-in: a session that outlives the browser should be a deliberate choice,
  // since the next person on a shared computer would land in this account.
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const navigate = useNavigate();
  const loginMutation = useLogin(redirectTo);
  const oauthLoginMutation = useOAuthLogin();
  const lockout = useAuthLockout(lockedUntil);
  const captcha = useCaptcha();
  const requestInFlight = useRef(false);
  const [activeMethod, setActiveMethod] = useState<"email" | "google">("email");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: FormValues) {
    if (requestInFlight.current || lockout.isLocked) return;
    if (captcha.required && !captcha.token) {
      captcha.requireVerification();
      return;
    }
    requestInFlight.current = true;
    setActiveMethod("email");
    try {
      const result = await loginMutation.mutate({
        data: { ...data, keepSignedIn, captchaToken: captcha.token ?? undefined },
      });
      lockout.recordResult(result);
      captcha.recordResult(result);
      // Open code entry as soon as the credentials identify an unconfirmed
      // account. The verification page sends the code without delaying navigation.
      if (result?.error && /email not confirmed/i.test(result.message ?? "")) {
        setPendingVerification({
          email: data.email,
          password: data.password,
          sendCodeOnArrival: true,
        });
        await navigate({ to: "/verify-email" });
      }
    } finally {
      requestInFlight.current = false;
    }
  }

  async function onGoogleSignin() {
    if (requestInFlight.current || lockout.isLocked) return;
    if (!captcha.token) {
      captcha.requireVerification();
      return;
    }
    requestInFlight.current = true;
    setActiveMethod("google");
    try {
      const email = form.getValues("email");
      const result = await oauthLoginMutation.mutate({
        provider: "google", keepSignedIn,
        email: z.string().email().safeParse(email).success ? email : undefined,
        captchaToken: captcha.token,
      });
      lockout.recordResult(result);
      captcha.recordResult(result);
    } finally {
      requestInFlight.current = false;
    }
  }

  const isSigningIn = form.formState.isSubmitting;

  const emailError = loginMutation.status !== "error" && loginMutation.data &&
    "captchaError" in loginMutation.data && loginMutation.data.captchaError ? null : describeSignInError(
    loginMutation.data,
    loginMutation.status === "error",
  );
  const oauthError = oauthLoginMutation.status === "error"
    ? "We couldn't connect to Google. Check your connection and try again."
    : oauthLoginMutation.data?.error && !oauthLoginMutation.data.captchaError ? oauthLoginMutation.data.message : null;
  const signInError = lockout.message ?? (activeMethod === "google"
    ? oauthError
    : lockout.hasExpired ? null : emailError);

  return (
    <LoginLayout>
      <div className="login-form-content">
        <h1 className="login-title">Welcome back</h1>

        {signInError && (
          <Alert variant="destructive" className="civic-enter-sm">
            <AlertCircleIcon />
            <AlertDescription>{signInError}</AlertDescription>
          </Alert>
        )}

        {error && !lockedUntil && (
          <Alert variant="destructive" className="civic-enter-sm">
            <AlertCircleIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="login-fields civic-stagger">
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  style={staggerStyle(0)}
                  className="login-field"
                >
                  <FieldLabel htmlFor="email" className="sr-only">
                    Email address
                  </FieldLabel>
                  <InputGroup
                    fieldSize="touch"
                    shape="pill"
                    className="login-input"
                  >
                    <InputGroupAddon>
                      <Mail size={16} aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="email"
                      type="email"
                      placeholder="Email address"
                      aria-invalid={fieldState.invalid}
                      aria-required="true"
                      aria-describedby={
                        fieldState.invalid ? "email-error" : undefined
                      }
                      autoComplete="email"
                    />
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError
                      id="email-error"
                      className="login-field-error"
                      errors={[fieldState.error]}
                    />
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
                  className="login-field"
                >
                  <FieldLabel htmlFor="password" className="sr-only">
                    Password
                  </FieldLabel>
                  <InputGroup
                    shape="pill"
                    fieldSize="touch"
                    className="login-input"
                  >
                    <InputGroupAddon>
                      <Lock size={16} aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      aria-invalid={fieldState.invalid}
                      aria-required="true"
                      aria-describedby={
                        fieldState.invalid ? "password-error" : undefined
                      }
                      autoComplete="current-password"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        className="login-password-toggle"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((shown) => !shown)}
                      >
                        {showPassword ? (
                          <EyeOff aria-hidden="true" />
                        ) : (
                          <Eye aria-hidden="true" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError
                      id="password-error"
                      className="login-field-error"
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />

            {/* Session length and the recovery route are the two decisions left
                before submitting, so they share one line under the fields. */}
            <div style={staggerStyle(2)} className="login-options">
              <Field orientation="horizontal" className="w-auto">
                <Checkbox
                  id="keep-signed-in"
                  checked={keepSignedIn}
                  aria-describedby={
                    keepSignedIn ? "login-session-note" : undefined
                  }
                  onCheckedChange={(checked) =>
                    setKeepSignedIn(checked === true)
                  }
                />
                <div className="login-session-label">
                  <FieldLabel htmlFor="keep-signed-in">
                    Keep me signed in
                  </FieldLabel>
                  {keepSignedIn && (
                    <p
                      id="login-session-note"
                      role="status"
                      className="login-session-note"
                    >
                      Stay signed in for {KEEP_SIGNED_IN_DAYS} days.
                    </p>
                  )}
                </div>
              </Field>

              <Link to="/forgot-password" className="login-link">
                Forgot password?
              </Link>
            </div>

            <div style={staggerStyle(3)} className="login-actions">
              {captcha.required && !lockout.isLocked && (
                <Captcha onToken={captcha.onToken} error={captcha.error} resetKey={captcha.resetKey} />
              )}
              <Button
                type="submit"
                shape="pill"
                size="touch"
                className="login-submit"
                disabled={isSigningIn || oauthLoginMutation.redirecting || lockout.isLocked || (captcha.required && !captcha.token)}
              >
                {isSigningIn ? (
                  <>
                    <Spinner />
                    Signing in
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              <div className="login-divider" aria-hidden="true">
                <span />
                or
                <span />
              </div>

              <Button
                type="button"
                variant="outline"
                shape="pill"
                size="touch"
                className="login-google"
                onClick={onGoogleSignin}
                disabled={isSigningIn || oauthLoginMutation.redirecting || lockout.isLocked || (captcha.required && !captcha.token)}
              >
                {oauthLoginMutation.redirecting ? (
                  <>
                    <Spinner />
                    Redirecting to Google…
                  </>
                ) : (
                  <>
                    <GoogleIcon className="login-google-icon" />
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
          </FieldGroup>
        </form>

        <div className="login-footer">
          New to CiviCheck?
          <Link to="/signup" className="login-link">
            Create an account
          </Link>
        </div>
      </div>
    </LoginLayout>
  );
}
