import { Link } from "@tanstack/react-router";
import {
  CheckCircle,
  ArrowRight,
  Eye,
  ShieldCheck,
  EyeClosed,
  AlertCircleIcon,
  Lock,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
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
import { Spinner } from "~/components/ui/spinner";
import { useResetPassword } from "../hooks/useResetPassword";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { useState } from "react";

const formSchema = z
  .object({
    password: z.string().min(8, "Password is required"),
    confirmPassword: z.string().min(8, "Please confirm you password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password doesn't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

const ResetPasswordForm = () => {
  const resetPasswordMutation = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isSuccess = resetPasswordMutation.status === "success";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(data: FormValues) {}

  return (
    <div className="flex min-h-dvh">
      {/* Left — Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Logo / Brand */}
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#003366] text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-[#003366] tracking-tight">
                CiviCheck
              </span>
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900 pt-4">
              {isSuccess ? "Password updated!" : "Set a new password"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSuccess
                ? "Your password has been reset successfully. You can now sign in with your new password."
                : "Enter your new password below. Make sure it's at least 8 characters."}
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <p className="font-medium">Password changed successfully</p>
                    <p className="mt-1">
                      You can now use your new password to sign in.
                    </p>
                  </div>
                </div>
              </div>

              <Link to="/login">
                <Button className="w-full">
                  <span className="flex items-center gap-2">
                    Go to sign in
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Server error */}
              {resetPasswordMutation.data?.error && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Update failed</AlertTitle>
                  <AlertDescription>
                    {resetPasswordMutation.data.message ||
                      "An unexpected error occurred. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              {/* New Password */}
              <FieldGroup>
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

                <Controller
                  control={form.control}
                  name="confirmPassword"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="confirmPassword">
                        Confirm Password
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Lock size={16} aria-hidden="true" />
                        </InputGroupAddon>

                        <InputGroupInput
                          {...field}
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />

                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            size="icon-xs"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            type="button"
                          >
                            {showConfirmPassword ? (
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
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={resetPasswordMutation.status === "pending"}
                  >
                    {resetPasswordMutation.status === "pending" ? (
                      <>
                        <Spinner />
                        Updating password
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </FieldGroup>
              </FieldGroup>
            </form>
          )}
        </div>
      </div>

      {/* Right — Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#003366] via-[#004080] to-[#1a5276] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/5 blur-xl" />
          <div className="absolute bottom-32 right-16 w-80 h-80 rounded-full bg-white/5 blur-xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-yellow-400/10 blur-2xl" />
        </div>
        <div className="relative z-10 max-w-md px-12 text-white text-center">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-white/90" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">Secure Your Account</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Choose a strong password to keep your CiviCheck account secure. Your
            personal information and document requests are protected by
            role-based access controls.
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
};

export default ResetPasswordForm;
