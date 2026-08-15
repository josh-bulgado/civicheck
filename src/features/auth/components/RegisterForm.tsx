import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle,
  Eye,
  EyeClosed,
  Mail,
  ShieldCheck,
  User,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import { useSignUp } from "../hooks/useSignUp";
import { Spinner } from "~/components/ui/spinner";
import { Button } from "~/components/ui/button";
import TopoPattern from "./TopoPattern";

const formSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password is required"),
    confirmPassword: z.string().min(8, "Please confirm you password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password doesn't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

const RegisterForm = () => {
  const signupMutation = useSignUp();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(data: FormValues) {
    signupMutation.mutate({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
  }

  return (
    <div className="auth-page flex min-h-dvh bg-ash">
      {/* Left — Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-basalt via-[#1A3A35] to-lagoon items-center justify-center relative overflow-hidden">
        {/* Topographic contour pattern */}
        <TopoPattern />
        <div className="relative z-10 max-w-md px-12 text-white text-center">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-white/90" />
            </div>
          </div>
          <h2 className="font-display text-3xl mb-4">Create Your Account</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Join CiviCheck to check your requirements before your visit, submit
            requests online, and track their status from submission to release —
            no more repeat trips to the CCRO.
          </p>
          <div className="mt-8 space-y-3">
            {[
              "See exact document requirements",
              "Submit requests online or walk-in",
              "Track your request in real time",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 text-sm text-white/70"
              >
                <CheckCircle className="w-4 h-4 text-lagoon shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-white/35">
            <span>City Civil Registrar Office</span>
            <span>·</span>
            <span>City Government of Legazpi</span>
          </div>
        </div>
      </div>

      {/* Right — Form */}
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
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Fill in your details below to get started with CiviCheck.
            </p>
          </div>

          {/* Success message */}
          {signupMutation.status === "success" &&
            signupMutation.data &&
            !signupMutation.data.error && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <p className="font-medium">Account created!</p>
                    <p className="mt-1">
                      {signupMutation.data.message ||
                        "Please check your email to confirm your account."}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Server error */}
            {signupMutation.data?.error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 mb-4">
                {signupMutation.data.message}
              </div>
            )}
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <User size={16} aria-hidden="true" />
                        </InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          id="firstName"
                          placeholder="Juan"
                          aria-invalid={fieldState.invalid}
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
                  name="lastName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="lastName">Last Name</FieldLabel>

                      <Input
                        {...field}
                        id="lastName"
                        placeholder="Dela Cruz"
                        aria-invalid={fieldState.invalid}
                      />

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

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
                        placeholder="At least 8 characters"
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
                            <EyeClosed size={16} />
                          ) : (
                            <Eye size={16} />
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
                            <EyeClosed size={16} />
                          ) : (
                            <Eye size={16} />
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

              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.status === "pending"}
              >
                {signupMutation.status === "pending" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4 shrink-0" />
                    Creating account...
                  </span>
                ) : (
                  "Create account"
                )}
              </Button>
            </FieldGroup>
          </form>

          {/* Footer link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
