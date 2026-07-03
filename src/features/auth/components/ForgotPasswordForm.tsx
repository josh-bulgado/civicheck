import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  CheckCircleIcon,
  KeyRound,
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
import TopoPattern from "./TopoPattern";

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

  function onSubmit(data: FormValues) {}

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

      {/* Right — Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-basalt via-[#1A3A35] to-lagoon items-center justify-center relative overflow-hidden">
        <TopoPattern />
        <div className="relative z-10 max-w-md px-12 text-white text-center">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-white/90" />
            </div>
          </div>
          <h2 className="font-display text-3xl mb-4">Reset Your Password</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            We'll help you get back into your account. Just enter the email
            address you registered with and we'll send you a secure link to
            create a new password.
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
};

export default ForgotPasswordForm;
