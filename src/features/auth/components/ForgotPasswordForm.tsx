import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  ArrowLeft,
  CheckCircleIcon,
  Mail,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Button } from "~/components/ui/button";
import { useForgotPassword } from "../hooks/useForgotPassword";
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
  const result = forgotPasswordMutation.data;
  // A server-reported failure still resolves the mutation, so "success" alone
  // would show the sent confirmation for a request that never sent anything.
  const isSuccess = forgotPasswordMutation.status === "success" && !result?.error;
  const requestError = result?.error
    ? result.message
    : forgotPasswordMutation.status === "error"
      ? "We could not reach the email service. Please try again in a moment."
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
          title={isSuccess ? "Check your email" : "Forgot your password?"}
          description={
            isSuccess
              ? `We've sent a password reset link to ${email}. Please check your inbox and follow the instructions.`
              : "Enter your email address and we'll send you a link to reset your password."
          }
        />

        {isSuccess ? (
          <div className="flex flex-col gap-5">
            <Alert variant="success">
              <CheckCircleIcon />
              <AlertTitle>Reset link sent!</AlertTitle>
              <AlertDescription>
                If an account exists with that email address, you'll receive a
                password reset link shortly. Please also check your spam folder.
              </AlertDescription>
            </Alert>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            {requestError && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Reset link not sent</AlertTitle>
                <AlertDescription>{requestError}</AlertDescription>
              </Alert>
            )}

            <FieldGroup className="gap-5">
              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-1.75">
                    <FieldLabel htmlFor="email" className={authLabelClass}>
                      Email address
                    </FieldLabel>
                    <InputGroup className={authFieldClass}>
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
                disabled={forgotPasswordMutation.status === "pending"}
              >
                {forgotPasswordMutation.status === "pending" ? (
                  <>
                    <Spinner />
                    Sending
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
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
