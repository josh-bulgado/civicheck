import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { AlertCircleIcon, ArrowLeft, Mail } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Button } from "~/components/ui/button";
import { staggerStyle } from "~/components/motion/stagger";
import { useForgotPassword } from "../hooks/useForgotPassword";
import { useVerifyRecoveryOtp } from "../hooks/useVerifyRecoveryOtp";
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
import { AuthEmblemPanel } from "./AuthSidePanel";
import { OtpCodeForm } from "./OtpCodeForm";
import {
  authButtonClass,
  authFieldClass,
  authLabelClass,
  AuthFormHeading,
  AuthSplitLayout,
} from "./AuthSplitLayout";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

const ForgotPasswordForm = () => {
  const forgotPasswordMutation = useForgotPassword();
  const verifyOtpMutation = useVerifyRecoveryOtp();
  const result = forgotPasswordMutation.data;
  // A server-reported failure still resolves the mutation, so "success" alone
  // would show the code-entry step for a request that never sent anything.
  const codeSent = forgotPasswordMutation.status === "success" && !result?.error;
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

  function onSubmit(data: FormValues) {
    forgotPasswordMutation.mutate({
      data: {
        email: data.email,
      },
    });
  }

  return (
    <AuthSplitLayout panel={<AuthEmblemPanel />}>
      <div className="flex flex-col gap-7">
        <AuthFormHeading
          title={codeSent ? "Check your email" : "Forgot your password?"}
          description={
            codeSent
              ? `We've sent a verification code to ${email}. Enter it below to continue.`
              : "Enter your email address and we'll send you a code to reset your password."
          }
        />

        {codeSent ? (
          <div className="civic-enter-scale flex flex-col gap-5">
            <OtpCodeForm
              isVerifying={verifyOtpMutation.status === "pending"}
              isResending={forgotPasswordMutation.status === "pending"}
              errorMessage={otpError}
              onVerify={(token) =>
                verifyOtpMutation.mutate({ data: { email, token } })
              }
              onResend={() =>
                forgotPasswordMutation.mutate({ data: { email } })
              }
            />

            <Link
              to="/login"
              className="group inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to sign in
            </Link>
          </div>
        ) : (
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

              <Button
                type="submit"
                className={authButtonClass}
                style={staggerStyle(1)}
                disabled={forgotPasswordMutation.status === "pending"}
              >
                {forgotPasswordMutation.status === "pending" ? (
                  <>
                    <Spinner />
                    Sending
                  </>
                ) : (
                  "Send reset code"
                )}
              </Button>

              <Link
                to="/login"
                style={staggerStyle(2)}
                className="group inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                Back to sign in
              </Link>
            </FieldGroup>
          </form>
        )}
      </div>
    </AuthSplitLayout>
  );
};

export default ForgotPasswordForm;
