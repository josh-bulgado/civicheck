import { Link } from "@tanstack/react-router";
import {
  CheckCircle,
  ArrowRight,
  Eye,
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
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { AuthBrandPanel } from "./AuthBrandPanel";

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
  const result = resetPasswordMutation.data;
  // A rejected update still resolves the mutation, so "success" alone would
  // announce a password change that never happened.
  const isSuccess = resetPasswordMutation.status === "success" && !result?.error;
  const updateError = result?.error
    ? result.message || "An unexpected error occurred. Please try again."
    : resetPasswordMutation.status === "error"
      ? "We could not reach the account service. Please try again in a moment."
      : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(data: FormValues) {
    resetPasswordMutation.mutate({
      data: {
        password: data.password,
      },
    });
  }

  return (
    <div className="auth-page flex min-h-dvh bg-background">
      {/* Left — Form */}
      <div className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="my-auto w-full max-w-105 shrink-0 space-y-8">
          {/* Logo / Brand */}
          <div className="space-y-2">
            <Link to="/"><CiviCheckIdentity /></Link>
            <h1 className="civic-title pt-4 text-2xl">
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
              <div className="status-success rounded-lg border p-4 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 size-5 shrink-0 text-success" />
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
              {updateError && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Update failed</AlertTitle>
                  <AlertDescription>{updateError}</AlertDescription>
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

      <AuthBrandPanel
        title="Protect your civic service account."
        description="Choose a strong password to keep your personal information and document requests secure."
      />
    </div>
  );
};

export default ResetPasswordForm;
