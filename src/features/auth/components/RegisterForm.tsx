import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { AlertCircleIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import {
  Field,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Checkbox } from "~/components/ui/checkbox";
import { useSignUp } from "../hooks/useSignUp";
import { Spinner } from "~/components/ui/spinner";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AuthBrandPanel } from "./AuthBrandPanel";
import {
  AuthCardFooter,
  AuthCardHeading,
  AuthCardLayout,
} from "./AuthCardLayout";
import { PasswordToggle } from "./PasswordToggle";
import { VerifyEmailNotice } from "./VerifyEmailNotice";
import { cn } from "~/lib/utils";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  mobileNumber: z
    .string()
    .regex(/^9\d{9}$/, "Enter a valid 10-digit mobile number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must include at least one number"),
  agreeToTerms: z.boolean().refine((value) => value === true, {
    message: "You must agree to continue",
  }),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * Four independent things a password can do right — length, a digit, mixed
 * character classes, and real length. Index 0 is the untouched state; anything
 * typed scores at least 1 so the meter always responds to the first keystroke.
 */
function passwordStrength(password: string) {
  if (!password) {
    return 0;
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password)))
    score += 1;
  if (password.length >= 12) score += 1;

  return Math.max(1, score);
}

const STRENGTH_STEPS = [
  { width: "0%", bar: "bg-transparent", label: "8+ characters, 1 number" },
  { width: "25%", bar: "bg-destructive", label: "Too weak" },
  { width: "50%", bar: "bg-warning", label: "Weak" },
  { width: "75%", bar: "bg-primary", label: "Good" },
  { width: "100%", bar: "bg-success", label: "Strong" },
] as const;

const RegisterForm = () => {
  const signupMutation = useSignUp();
  const [showPassword, setShowPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      mobileNumber: "",
      password: "",
      agreeToTerms: false,
    },
  });

  const password = form.watch("password");
  const strength = STRENGTH_STEPS[passwordStrength(password)];

  async function onSubmit(data: FormValues) {
    const result = await signupMutation.mutate({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNumber: data.mobileNumber,
      },
    });

    if (result && !result.error) {
      setVerificationEmail(data.email);
      form.reset();
    }
  }

  if (verificationEmail) {
    return (
      <VerifyEmailNotice
        email={verificationEmail}
        onUseDifferentEmail={() => setVerificationEmail(null)}
      />
    );
  }

  return (
    <AuthCardLayout
      className="max-w-120"
      panel={
        <AuthBrandPanel
          title="One account for every CCRO request."
          description="Your details are saved once, so the next request only takes a minute to file."
          steps={[
            {
              title: "Create your account",
              description: "About a minute — no documents needed yet.",
            },
            {
              title: "File your request online",
              description: "Upload your documents and pick a queue slot.",
            },
            {
              title: "Visit once to pay and claim",
              description:
                "Settle the fee at the cashier and receive your document.",
            },
          ]}
        />
      }
    >
      <div className="space-y-5">
        <AuthCardHeading
          title="Create your account"
          description="Use the name that appears on your valid ID."
        />

        {signupMutation.data?.error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Account not created</AlertTitle>
            <AlertDescription>{signupMutation.data.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Controller
              control={form.control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="flex-1">
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <Input
                    {...field}
                    id="firstName"
                    className="h-10"
                    placeholder="Juan"
                    aria-invalid={fieldState.invalid}
                    autoComplete="given-name"
                  />
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
                <Field data-invalid={fieldState.invalid} className="flex-1">
                  <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                  <Input
                    {...field}
                    id="lastName"
                    className="h-10"
                    placeholder="Dela Cruz"
                    aria-invalid={fieldState.invalid}
                    autoComplete="family-name"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* Email and mobile share a row and a single note underneath — they
              are one decision ("where do we reach you?"), not two. */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-4 sm:flex-row">
              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="flex-1">
                    <FieldLabel htmlFor="email">Email address</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      className="h-10"
                      placeholder="juan.delacruz@email.com"
                      aria-invalid={fieldState.invalid}
                      autoComplete="email"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="mobileNumber"
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className="sm:w-45 sm:flex-none"
                  >
                    <FieldLabel htmlFor="mobileNumber">Mobile number</FieldLabel>
                    <InputGroup className="h-10">
                      <InputGroupAddon>
                        <InputGroupText className="font-bold text-body-strong">
                          +63
                        </InputGroupText>
                      </InputGroupAddon>
                      <Separator orientation="vertical" className="h-6" />
                      <InputGroupInput
                        {...field}
                        id="mobileNumber"
                        type="tel"
                        inputMode="numeric"
                        placeholder="912 345 6789"
                        aria-invalid={fieldState.invalid}
                        autoComplete="tel-national"
                        maxLength={10}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                      />
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <p className="text-[13px] text-muted-foreground">
              Updates and queue reminders go to these — no spam.
            </p>
          </div>

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup className="h-10">
                  <InputGroupInput
                    {...field}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters, with one number"
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                  />
                  <PasswordToggle
                    shown={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </InputGroup>

                <div className="flex items-center gap-2.5">
                  <div
                    className="h-1 flex-1 overflow-hidden rounded-full bg-border-strong"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width,background-color] duration-200",
                        strength.bar,
                      )}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <span className="shrink-0 text-[13px] font-bold text-muted-foreground">
                    {strength.label}
                  </span>
                </div>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="agreeToTerms"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="agreeToTerms"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-invalid={fieldState.invalid}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="agreeToTerms"
                    className="text-[15px] leading-snug text-body"
                  >
                    I agree to the{" "}
                    <Link
                      to="/"
                      className="font-bold text-primary hover:text-primary-hover"
                    >
                      Terms of Use
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/"
                      className="font-bold text-primary hover:text-primary-hover"
                    >
                      Privacy Notice
                    </Link>
                    .
                  </label>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </div>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="mt-1 w-full text-[15px]"
            disabled={signupMutation.status === "pending"}
          >
            {signupMutation.status === "pending" ? (
              <>
                <Spinner />
                Creating account
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <AuthCardFooter>
          Already have an account?
          <Link
            to="/login"
            className="font-bold text-primary hover:text-primary-hover"
          >
            Sign in
          </Link>
        </AuthCardFooter>
      </div>
    </AuthCardLayout>
  );
};

export default RegisterForm;
