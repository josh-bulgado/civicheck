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
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "~/components/ui/input-group";
import { Separator } from "~/components/ui/separator";

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

const AppleIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g
      id="SVGRepo_tracerCarrier"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></g>
    <g id="SVGRepo_iconCarrier">
      {" "}
      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"></path>{" "}
    </g>
  </svg>
);

export function LoginForm({ redirect: redirectTo, error }: { redirect?: string; error?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();
  const oauthLoginMutation = useOAuthLogin();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: FormValues) {
    loginMutation.mutate({ data });
  }

  return (
    <div className="auth-page flex min-h-dvh bg-[#f9fafb]">
      {/* Left — Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Logo / Brand */}
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1a4480] text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-[#1a4480] tracking-tight">
                CiviCheck
              </span>
            </Link>
            <h1 className="text-2xl font-semibold text-[#1b1b1b] pt-4">
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
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => oauthLoginMutation.mutate({ provider: "apple" })}
              disabled={oauthLoginMutation.status === "pending"}
            >
              <AppleIcon className="h-4 w-4" />
              Continue with Apple
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
            {/* Server error */}
            {loginMutation.data?.error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {loginMutation.data.message}
              </div>
            )}

            {/* URL Search Param Error */}
            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 mb-4">
                {error}
              </div>
            )}

            {/* Email */}
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
                    className="text-[#005ea2] hover:text-[#1a4480] font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.status === "pending"}
                >
                  {loginMutation.status === "pending"
                    ? "Signing in..."
                    : "Sign in"}
                </Button>
              </FieldGroup>
            </FieldGroup>
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
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#1a4480] via-[#005ea2] to-[#0b4778] items-center justify-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/5 blur-xl" />
          <div className="absolute bottom-32 right-16 w-80 h-80 rounded-full bg-white/5 blur-xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-yellow-400/10 blur-2xl" />
        </div>
        <div className="relative z-10 max-w-md px-12 text-white text-center">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <FileText className="w-10 h-10 text-white/90" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Know What You Need.
            <br />
            Before You Need It.
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            CiviCheck shows you the exact requirements for your civil registry
            document request — then tracks it from submission to release, so
            you're not making repeat trips to the CCRO.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-white/50">
            <span>City Civil Registrar Office</span>
            <span>·</span>
            <span>City Government of Legazpi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
