import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { AlertCircleIcon } from "lucide-react";
import { JSX, SVGProps, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { staggerStyle } from "~/components/motion/stagger";
import { InputGroup, InputGroupInput } from "~/components/ui/input-group";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
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
import { PasswordToggle } from "./PasswordToggle";
import { VerifyEmailNotice } from "./VerifyEmailNotice";

const formSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    middleName: z.string(),
    noMiddleName: z.boolean(),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must include at least one number"),
    agreeToTerms: z.boolean().refine((value) => value === true, {
      message: "You must agree to continue",
    }),
  })
  // Civil registry records carry the middle name, so a blank one has to be a
  // declaration rather than an omission — otherwise the office cannot tell a
  // resident who has none from one who skipped the field.
  .refine((data) => data.noMiddleName || data.middleName.trim().length > 0, {
    message: 'Enter your middle name, or tick "I have no middle name"',
    path: ["middleName"],
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
      noMiddleName: false,
      email: "",
      password: "",
      agreeToTerms: false,
    },
  });

  const noMiddleName = form.watch("noMiddleName");

  async function onSubmit(data: FormValues) {
    const signup: PendingSignup = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.noMiddleName ? "" : data.middleName.trim(),
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
          <div style={staggerStyle(0)} className="flex gap-2.5">
            <Controller
              control={form.control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="min-w-0 flex-1 gap-1.5"
                >
                  <FieldLabel htmlFor="firstName" className={authLabelClass}>
                    First name
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
              name="lastName"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="min-w-0 flex-1 gap-1.5"
                >
                  <FieldLabel htmlFor="lastName" className={authLabelClass}>
                    Last name
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
          </div>

          <div style={staggerStyle(1)} className="flex flex-col gap-2">
            <Controller
              control={form.control}
              name="middleName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor="middleName" className={authLabelClass}>
                    Middle name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="middleName"
                    className={authFilledFieldClass}
                    placeholder={noMiddleName ? "Not applicable" : "Santos"}
                    disabled={noMiddleName}
                    aria-invalid={fieldState.invalid}
                    autoComplete="additional-name"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="noMiddleName"
              render={({ field }) => (
                <label className="flex w-fit items-center gap-2.5 text-[12.5px] text-muted-2">
                  <Checkbox
                    id="noMiddleName"
                    checked={field.value === true}
                    onCheckedChange={(checked) => {
                      const declared = checked === true;
                      field.onChange(declared);
                      if (declared) {
                        // Anything already typed would be submitted behind a
                        // disabled field the applicant can no longer see.
                        form.setValue("middleName", "");
                        form.clearErrors("middleName");
                      }
                    }}
                  />
                  I have no middle name
                </label>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                style={staggerStyle(2)}
                className="gap-1.5"
              >
                <FieldLabel htmlFor="email" className={authLabelClass}>
                  Email
                </FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="email"
                  className={authFilledFieldClass}
                  placeholder="Enter your email"
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
            name="password"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                style={staggerStyle(3)}
                className="gap-1.5"
              >
                <FieldLabel htmlFor="password" className={authLabelClass}>
                  Password
                </FieldLabel>
                <InputGroup className={authFilledGroupClass}>
                  <InputGroupInput
                    {...field}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="px-3.5"
                    placeholder="8+ characters, one number"
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
            name="agreeToTerms"
            render={({ field, fieldState }) => (
              <div style={staggerStyle(4)} className="flex flex-col gap-1.5 pt-1 pb-1.5">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="agreeToTerms"
                    checked={field.value === true}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    aria-invalid={fieldState.invalid}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="agreeToTerms"
                    className="text-[13px] leading-snug text-body"
                  >
                    I agree to the{" "}
                    <Link to="/" className={authLinkClass}>
                      Terms of Use
                    </Link>{" "}
                    and{" "}
                    <Link to="/" className={authLinkClass}>
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

          <div style={staggerStyle(5)} className="flex flex-col gap-3.5">
            <Button
              type="submit"
              className={authButtonClass}
              disabled={signupMutation.status === "pending"}
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
              disabled={oauthLoginMutation.status === "pending"}
            >
              <GoogleIcon className="size-4.5" />
              Sign up with Google
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
