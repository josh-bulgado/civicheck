import { Link } from "@tanstack/react-router";
import { CheckCircle, ArrowRight, AlertCircleIcon, Lock } from "lucide-react";
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
} from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";
import { staggerStyle } from "~/components/motion/stagger";
import { useResetPassword } from "../hooks/useResetPassword";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { useState } from "react";
import { AuthEmblemPanel } from "./AuthSidePanel";
import {
  authButtonClass,
  authFieldClass,
  authLabelClass,
  AuthFormHeading,
  AuthSplitLayout,
} from "./AuthSplitLayout";
import { PasswordToggle } from "./PasswordToggle";
import { cn } from "~/lib/utils";

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
    <AuthSplitLayout panel={<AuthEmblemPanel />}>
      <div className="flex flex-col gap-7">
        <AuthFormHeading
          title={isSuccess ? "Password updated!" : "Set a new password"}
          description={
            isSuccess
              ? "Your password has been reset successfully. You can now sign in with your new password."
              : "Enter your new password below. Make sure it's at least 8 characters."
          }
        />

        {isSuccess ? (
          <div className="civic-enter-scale flex flex-col gap-5">
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

            <Button
              className={cn(authButtonClass, "group")}
              render={<Link to="/login" />}
            >
              Go to sign in
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Button>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            {updateError && (
              <Alert variant="destructive" className="civic-enter-sm">
                <AlertCircleIcon />
                <AlertTitle>Update failed</AlertTitle>
                <AlertDescription>{updateError}</AlertDescription>
              </Alert>
            )}

            <FieldGroup className="civic-stagger gap-5">
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    style={staggerStyle(0)}
                    className="gap-1.75"
                  >
                    <FieldLabel htmlFor="password" className={authLabelClass}>
                      New password
                    </FieldLabel>
                    <InputGroup className={`${authFieldClass} px-0`}>
                      <InputGroupAddon>
                        <Lock size={16} aria-hidden="true" />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        aria-invalid={fieldState.invalid}
                        autoComplete="new-password"
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

              <Controller
                control={form.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    style={staggerStyle(1)}
                    className="gap-1.75"
                  >
                    <FieldLabel
                      htmlFor="confirmPassword"
                      className={authLabelClass}
                    >
                      Confirm new password
                    </FieldLabel>
                    <InputGroup className={`${authFieldClass} px-0`}>
                      <InputGroupAddon>
                        <Lock size={16} aria-hidden="true" />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        aria-invalid={fieldState.invalid}
                        autoComplete="new-password"
                      />
                      <PasswordToggle
                        shown={showConfirmPassword}
                        onToggle={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
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
                className={authButtonClass}
                style={staggerStyle(2)}
                disabled={resetPasswordMutation.status === "pending"}
              >
                {resetPasswordMutation.status === "pending" ? (
                  <>
                    <Spinner />
                    Updating password
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
            </FieldGroup>
          </form>
        )}
      </div>
    </AuthSplitLayout>
  );
};

export default ResetPasswordForm;
