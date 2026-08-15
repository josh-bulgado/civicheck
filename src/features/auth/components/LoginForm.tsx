import { JSX, SVGProps, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

import {
  Eye,
  Lock,
  Mail,
  EyeClosed,
  AlertCircleIcon,
  Info,
} from "lucide-react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { useLogin } from "~/features/auth/hooks/useLogin";
import { useOAuthLogin } from "~/features/auth/hooks/useOAuthLogin";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "~/components/ui/input-group";
import { Checkbox } from "~/components/ui/checkbox";
import { Separator } from "~/components/ui/separator";
import { Spinner } from "~/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { AuthBrandPanel } from "./AuthBrandPanel";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: FormValues) {
    loginMutation.mutate({ data });
  }

  return (
    <div className="flex min-h-dvh">
      <AuthBrandPanel
        title="Know what you need before you visit."
        description="Check requirements, submit a request online, and follow it from filing to release — all in one place."
        benefits={[
          "See the exact documents for your request",
          "Track your request in real time",
          "Pay at the CCRO cashier — never online",
        ]}
      />

      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-113 space-y-5">
          <Link to="/" className="mb-2 inline-flex lg:hidden">
            <CiviCheckIdentity />
          </Link>

          <div className="space-y-2">
            <h1 className="civic-title text-[32px]">Sign in</h1>
            <p className="text-[17px] leading-normal text-muted-2">
              Access your requests and track their status.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FieldSet>
              {loginMutation.data?.error && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Sign in failed</AlertTitle>
                  <AlertDescription>
                    Invalid email or password. Please check your credentials
                    and try again.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <FieldGroup>
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="email">Email address</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Mail size={16} aria-hidden="true" />
                        </InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          id="email"
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
                    <Field data-invalid={fieldState.invalid}>
                      <div className="flex items-baseline justify-between">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <Link
                          to="/forgot-password"
                          className="text-[15px] font-bold text-primary hover:text-primary-hover"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <InputGroup>
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

                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            size="icon-xs"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                          >
                            {showPassword ? (
                              <EyeClosed className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <label className="flex items-center gap-2.5 text-[15px] text-body">
                  <Checkbox
                    checked={keepSignedIn}
                    onCheckedChange={(checked) => setKeepSignedIn(checked === true)}
                  />
                  Keep me signed in on this device
                </label>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-base"
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
              </FieldGroup>
            </FieldSet>
          </form>

          <div className="flex items-center gap-3.5">
            <Separator className="flex-1" />
            <span className="text-[15px] text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-center gap-2.5 text-base"
            onClick={() => oauthLoginMutation.mutate({ provider: "google" })}
            disabled={oauthLoginMutation.status === "pending"}
          >
            <GoogleIcon className="h-4.5 w-4.5" />
            Continue with Google
          </Button>

          <Separator />

          <p className="text-[17px] text-body">
            New to CiviCheck?{" "}
            <Link to="/signup" className="font-bold text-primary hover:text-primary-hover">
              Create an account
            </Link>
          </p>

          <div className="flex gap-2.5 rounded-lg border border-primary/20 bg-primary-tint px-4 py-3.5">
            <Info className="mt-0.5 size-4.75 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-[15px] leading-snug text-body-strong">
              You don&rsquo;t need an account to be served. Walk-in requests are
              still accepted at the CCRO during office hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
