import { JSX, SVGProps, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

import {
  Eye,
  Lock,
  Mail,
  CheckCircle,
  FileText,
  EyeClosed,
  AlertCircleIcon,
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
import { Separator } from "~/components/ui/separator";
import { Spinner } from "~/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import TopoPattern from "./TopoPattern";

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
  const loginMutation = useLogin();
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
    <div className="auth-page flex min-h-dvh bg-ash">
      {/* Left — Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Logo / Brand */}
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg border-2 border-lagoon text-lagoon">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
              <span className="text-xl font-bold text-basalt tracking-tight">
                CiviCheck
              </span>
            </Link>
            <h1 className="text-2xl font-semibold text-basalt pt-4">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to access your requests, track their
              status, and manage your documents.
            </p>
          </div>

          <div className="space-y-5">
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => oauthLoginMutation.mutate({ provider: "google" })}
              disabled={oauthLoginMutation.status === "pending"}
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </Button>

            <div className="flex items-center gap-2">
              <Separator className="flex-1 " />
              <span className="text-sm text-muted-foreground">
                or continue with email
              </span>
              <Separator className="flex-1" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldSet>
              {/* Server error */}
              {loginMutation.data?.error && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Sign in failed</AlertTitle>
                  <AlertDescription>
                    Invalid email or password. Please check your credentials and
                    try again.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 mb-4">
                  {error}
                </div>
              )}

              <FieldGroup>
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Mail size={16} aria-hidden="true" />
                        </InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          id="email"
                          placeholder="you.example.com"
                          aria-invalid={fieldState.invalid}
                          autoComplete="on"
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
                      <FieldLabel htmlFor="password">Password</FieldLabel>
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
                          autoComplete="off"
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

                <FieldGroup>
                  <div className="flex items-center justify-between text-sm">
                    <Link
                      to="/forgot-password"
                      className="text-lagoon hover:text-[#0D5E53] font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
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
              </FieldGroup>
            </FieldSet>

            {/* Email */}
          </form>

          {/* Footer link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-primary font-medium hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right — Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-basalt via-[#1A3A35] to-lagoon items-center justify-center relative overflow-hidden">
        {/* Topographic contour pattern */}
        <TopoPattern />
        <div className="relative z-10 max-w-md px-12 text-white text-center">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <FileText className="w-8 h-8 text-white/90" />
            </div>
          </div>
          <h2 className="font-display text-3xl mb-4">
            Know What You Need.
            <br />
            Before You Need It.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            CiviCheck shows you the exact requirements for your civil registry
            document request — then tracks it from submission to release, so
            you're not making repeat trips to the CCRO.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-white/35">
            <span>City Civil Registrar Office</span>
            <span>·</span>
            <span>City Government of Legazpi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
