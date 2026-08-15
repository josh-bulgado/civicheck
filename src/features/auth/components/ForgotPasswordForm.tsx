import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import {
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
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { AuthBrandPanel } from "./AuthBrandPanel";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

const ForgotPasswordForm = () => {
  const forgotPasswordMutation = useForgotPassword();
  const isSuccess = forgotPasswordMutation.status === "success";

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
    <div className="auth-page flex min-h-dvh bg-background">
      {/* Left — Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Logo / Brand */}
          <div className="space-y-2">
            <Link to="/"><CiviCheckIdentity /></Link>

            <h1 className="civic-title pt-4 text-2xl">
              {isSuccess ? "Check your email" : "Forgot your password?"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSuccess
                ? `We've sent a password reset link to ${email}. Please check your inbox and follow the instructions.`
                : "Enter your email address and we'll send you a link to reset your password."}
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-5">
              <Alert variant="success">
                <CheckCircleIcon />
                <AlertTitle>Reset link sent!</AlertTitle>
                <AlertDescription>
                  If an account exists with that email address, you'll receive a
                  password reset link shortly. Please also check your spam
                  folder.
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Server error */}

              {forgotPasswordMutation.error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  {forgotPasswordMutation.data?.error}
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

                <Button
                  type="submit"
                  className="w-full"
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
                <FieldGroup>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Link>
                </FieldGroup>
              </FieldGroup>
            </form>
          )}
        </div>
      </div>

      <AuthBrandPanel
        title="Recover your account securely."
        description="Enter your registered email and we will send a secure link so you can return to your CiviCheck requests."
      />
    </div>
  );
};

export default ForgotPasswordForm;
