import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { AlertCircleIcon, Lock, Mail } from "lucide-react";
import { JSX, SVGProps, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { staggerStyle } from "~/components/motion/stagger";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { NO_SUFFIX, SUFFIXES } from "~/lib/subject-fields";
import { LegalDialogLink } from "~/features/legal/components/LegalDialogLink";
import { signupInputSchema } from "../auth.schema";
import { useSignUp } from "../hooks/useSignUp";
import { useVerifySignupOtp } from "../hooks/useVerifySignupOtp";
import { useOAuthLogin } from "../hooks/useOAuthLogin";
import { Spinner } from "~/components/ui/spinner";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AuthProgressPanel } from "./AuthSidePanel";
import {
  authButtonClass,
  authFilledFieldClass,
  authFilledGroupClass,
  authLabelClass,
  authLinkClass,
  AuthFormDivider,
  AuthFormFooter,
  AuthFormHeading,
  AuthSplitLayout,
} from "./AuthSplitLayout";
import { RequiredLegend, RequiredMark } from "~/components/ui/required-mark";
import { PasswordToggle } from "./PasswordToggle";
import { VerifyEmailNotice } from "./VerifyEmailNotice";

// The field rules live in auth.schema.ts so the server enforces exactly what
// this form shows; only the consent checkbox belongs to the form alone.
const formSchema = signupInputSchema.extend({
  agreeToTerms: z.boolean().refine((value) => value === true, {
    message: "You must agree to continue",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const GoogleIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

type PendingSignup = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
};

const RegisterForm = () => {
  const signupMutation = useSignUp();
  const verifyOtpMutation = useVerifySignupOtp();
  const oauthLoginMutation = useOAuthLogin();
  const [showPassword, setShowPassword] = useState(false);
  // Kept in memory (never persisted) so the resend action can re-run the same
  // signup call — that is what mints a fresh code once the previous one has
  // been sent.
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(
    null,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      middleName: "",
      suffix: "",
      email: "",
      password: "",
      agreeToTerms: false,
    },
  });

  // Sign up stays disabled until every rule in the schema passes, including the
  // terms checkbox. This reads the schema against the live values rather than
  // `formState.isValid`: with `mode: "onBlur"` that flag only refreshes on
  // blur, so ticking a checkbox would leave the button stale until focus moved
  // away.
  const isComplete = formSchema.safeParse(form.watch()).success;

  async function onSubmit(data: FormValues) {
    const signup: PendingSignup = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName.trim(),
      suffix: data.suffix.trim(),
    };
    const result = await signupMutation.mutate({ data: signup });

    if (result && !result.error) {
      setPendingSignup(signup);
      form.reset();
    }
  }

  const otpError = verifyOtpMutation.data?.error
    ? verifyOtpMutation.data.message
    : verifyOtpMutation.status === "error"
      ? "We could not reach the account service. Please try again in a moment."
      : null;

  return (
    <AuthSplitLayout panel={<AuthProgressPanel />} className="max-w-85">
      <VerifyEmailNotice
        open={pendingSignup !== null}
        email={pendingSignup?.email ?? ""}
        isVerifying={verifyOtpMutation.status === "pending"}
        isResending={signupMutation.status === "pending"}
        errorMessage={otpError}
        onVerify={(token) => {
          if (!pendingSignup) return;
          verifyOtpMutation.mutate({
            data: { email: pendingSignup.email, token },
          });
        }}
        onResend={() => {
          if (!pendingSignup) return;
          signupMutation.mutate({ data: pendingSignup });
        }}
        onUseDifferentEmail={() => setPendingSignup(null)}
      />

      <div className="flex flex-col gap-6.5">
        <AuthFormHeading title="Create an account" />

        {signupMutation.data?.error && (
          <Alert variant="destructive" className="civic-enter-sm">
            <AlertCircleIcon />
            <AlertTitle>Account not created</AlertTitle>
            <AlertDescription>{signupMutation.data.message}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="civic-stagger flex flex-col gap-3.5"
        >
          <Controller
            control={form.control}
            name="firstName"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                style={staggerStyle(0)}
                className="gap-1.5"
              >
                <FieldLabel htmlFor="firstName" className={authLabelClass}>
                  First name
                  <RequiredMark />
                </FieldLabel>
                <Input
                  {...field}
                  id="firstName"
                  className={authFilledFieldClass}
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
            name="middleName"
            render={({ field }) => (
              <Field style={staggerStyle(1)} className="gap-1.5">
                <FieldLabel htmlFor="middleName" className={authLabelClass}>
                  Middle name
                </FieldLabel>
                <Input
                  {...field}
                  id="middleName"
                  className={authFilledFieldClass}
                  placeholder="Santos (Optional)"
                  autoComplete="additional-name"
                />
              </Field>
            )}
          />

          {/* Suffix modifies the surname, so it shares a row with it. */}
          <div style={staggerStyle(2)} className="flex items-start gap-2.5">
            <Controller
              control={form.control}
              name="lastName"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="min-w-0 flex-1 gap-1.5"
                >
                  <FieldLabel htmlFor="lastName" className={authLabelClass}>
                    Last name <RequiredMark />
                  </FieldLabel>
                  <Input
                    {...field}
                    id="lastName"
                    className={authFilledFieldClass}
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

            <Controller
              control={form.control}
              name="suffix"
              render={({ field }) => (
                <Field className="w-24 shrink-0 gap-1.5">
                  <FieldLabel htmlFor="suffix" className={authLabelClass}>
                    Suffix
                  </FieldLabel>
                  <Select
                    items={SUFFIXES}
                    value={field.value || NO_SUFFIX}
                    onValueChange={(value) =>
                      field.onChange(value === NO_SUFFIX ? "" : value)
                    }
                  >
                    <SelectTrigger
                      id="suffix"
                      className={`${authFilledFieldClass} w-full data-[size=default]:h-11`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {SUFFIXES.map((suffix) => (
                          <SelectItem key={suffix.value} value={suffix.value}>
                            {suffix.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                style={staggerStyle(3)}
                className="gap-1.5"
              >
                <FieldLabel htmlFor="email" className={authLabelClass}>
                  Email <RequiredMark />
                </FieldLabel>
                <InputGroup className={`${authFilledGroupClass} px-0`}>
                  <InputGroupAddon>
                    <Mail size={16} aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    id="email"
                    type="email"
                    placeholder="Enter your email"
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

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                style={staggerStyle(4)}
                className="gap-1.5"
              >
                <FieldLabel htmlFor="password" className={authLabelClass}>
                  Password <RequiredMark />
                </FieldLabel>
                <InputGroup className={`${authFilledGroupClass} px-0`}>
                  <InputGroupAddon>
                    <Lock size={16} aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    aria-invalid={fieldState.invalid}
                    aria-describedby="password-help"
                    autoComplete="new-password"
                  />
                  <PasswordToggle
                    shown={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </InputGroup>
                <FieldDescription id="password-help" className="text-[13px]">
                  At least 8 characters, including one number.
                </FieldDescription>
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
              <Field
                data-invalid={fieldState.invalid}
                style={staggerStyle(5)}
                className="gap-1.5 pt-1 pb-1.5"
              >
                <Field orientation="horizontal">
                  <Checkbox
                    id="agreeToTerms"
                    checked={field.value === true}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldLabel
                    htmlFor="agreeToTerms"
                    className="text-[13px] leading-snug text-body"
                  >
                    I agree to the{" "}
                    <LegalDialogLink document="terms" className={authLinkClass}>
                      Terms of Use
                    </LegalDialogLink>{" "}
                    and{" "}
                    <LegalDialogLink
                      document="privacy"
                      className={authLinkClass}
                    >
                      Privacy Notice
                    </LegalDialogLink>
                    .
                  </FieldLabel>
                </Field>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div style={staggerStyle(6)} className="flex flex-col gap-3.5">
            <Button
              type="submit"
              className={authButtonClass}
              disabled={signupMutation.status === "pending" || !isComplete}
            >
              {signupMutation.status === "pending" ? (
                <>
                  <Spinner />
                  Creating account
                </>
              ) : (
                "Sign up"
              )}
            </Button>

            <AuthFormDivider />

            <Button
              variant="outline"
              className={`${authButtonClass} justify-center gap-2.5 text-sm font-medium`}
              onClick={() => oauthLoginMutation.mutate({ provider: "google" })}
              disabled={oauthLoginMutation.redirecting}
            >
              {oauthLoginMutation.redirecting ? (
                <>
                  <Spinner />
                  Redirecting to Google…
                </>
              ) : (
                <>
                  <GoogleIcon className="size-4.5" />
                  Sign up with Google
                </>
              )}
            </Button>
          </div>
        </form>

        <AuthFormFooter>
          Already have an account?
          <Link to="/login" className={authLinkClass}>
            Sign in
          </Link>
        </AuthFormFooter>
      </div>
    </AuthSplitLayout>
  );
};

export default RegisterForm;
