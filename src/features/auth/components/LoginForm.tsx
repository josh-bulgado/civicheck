import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

import { AlertCircleIcon, Lock, Mail } from "lucide-react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { staggerStyle } from "~/components/motion/stagger";
import { useLogin } from "~/features/auth/hooks/useLogin";
import { useOAuthLogin } from "~/features/auth/hooks/useOAuthLogin";
import { setPendingVerification } from "~/features/auth/pending-verification";
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
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/ui/spinner";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AuthDocketPanel } from "./AuthSidePanel";
import {
  authButtonClass,
  authFieldClass,
  authLabelClass,
  authLinkClass,
  AuthFormFooter,
  AuthFormHeading,
  AuthSplitLayout,
} from "./AuthSplitLayout";
import { GoogleIcon } from "./GoogleIcon";
import { PasswordToggle } from "./PasswordToggle";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

const INVALID_CREDENTIALS = "Wrong Email and Password";

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
}: {
  redirect?: string;
  error?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  // Opt-in: a session that outlives the browser should be a deliberate choice,
  // since the next person on a shared computer would land in this account.
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const navigate = useNavigate();
  const loginMutation = useLogin(redirectTo);
  const oauthLoginMutation = useOAuthLogin();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: FormValues) {
    const result = await loginMutation.mutate({
      data: { ...data, keepSignedIn },
    });
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
  }

  const isSigningIn = form.formState.isSubmitting;

  const signInError = describeSignInError(
    loginMutation.data,
    loginMutation.status === "error",
  );

  return (
    <AuthSplitLayout panel={<AuthDocketPanel />}>
      <div className="flex flex-col gap-7">
        <AuthFormHeading
          title="Welcome back"
          description="Please enter your details"
          className="text-[34px] font-extrabold"
        />

        {signInError && (
          <Alert variant="destructive" className="civic-enter-sm">
            <AlertCircleIcon />
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
                  <InputGroup className={`${authFieldClass} px-0`}>
                    <InputGroupAddon>
                      <Mail size={16} aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="email"
                      type="email"
                      placeholder="juan.delacruz@email.com"
                      aria-invalid={fieldState.invalid}
                      autoComplete="email"
                    />
                  </InputGroup>
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
                  <InputGroup className={`${authFieldClass} px-0`}>
                    <InputGroupAddon>
                      <Lock size={16} aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="password"
                      type={showPassword ? "text" : "password"}
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
              <Field orientation="horizontal" className="w-auto">
                <Checkbox
                  id="keep-signed-in"
                  checked={keepSignedIn}
                  onCheckedChange={(checked) =>
                    setKeepSignedIn(checked === true)
                  }
                />
                <FieldLabel htmlFor="keep-signed-in">Keep me signed in</FieldLabel>
              </Field>

              <Link
                to="/forgot-password"
                className={`${authLinkClass} text-sm`}
              >
                Forgot password
              </Link>
            </div>

            <div style={staggerStyle(3)} className="flex flex-col gap-3">
              <Button
                type="submit"
                className={authButtonClass}
                disabled={isSigningIn}
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

              <Button
                variant="outline"
                className={`${authButtonClass} justify-center gap-2.5 text-sm font-medium`}
                onClick={() =>
                  oauthLoginMutation.mutate({ provider: "google", keepSignedIn })
                }
                disabled={oauthLoginMutation.redirecting}
              >
                {oauthLoginMutation.redirecting ? (
                  <>
                    <Spinner />
                    Redirecting to Google…
                  </>
                ) : (
                  <>
                    <GoogleIcon className="size-4.5" />
                    Sign in with Google
                  </>
                )}
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
