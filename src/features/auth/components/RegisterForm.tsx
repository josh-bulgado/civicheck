import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { AlertCircleIcon, Lock, Mail } from "lucide-react";
import { useState } from "react";
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
import { checkMiddleNameAnswer, signupFieldsSchema } from "../auth.schema";
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
import { GoogleIcon } from "./GoogleIcon";
import { PasswordToggle } from "./PasswordToggle";
import { VerifyEmailNotice } from "./VerifyEmailNotice";

// The field rules live in auth.schema.ts so the server enforces exactly what
// this form shows; only the consent checkbox belongs to the form alone.
const formSchema = signupFieldsSchema
  .extend({
    agreeToTerms: z.boolean().refine((value) => value === true, {
      message: "You must agree to continue",
    }),
  })
  .superRefine(checkMiddleNameAnswer);

type FormValues = z.infer<typeof formSchema>;

type PendingSignup = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  hasNoMiddleName: boolean;
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
      hasNoMiddleName: false,
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
  const hasNoMiddleName = form.watch("hasNoMiddleName");

  async function onSubmit(data: FormValues) {
    const signup: PendingSignup = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.hasNoMiddleName ? "" : data.middleName.trim(),
      hasNoMiddleName: data.hasNoMiddleName,
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
                  First Name
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

          {/* Suffix modifies the surname, so it shares a row with it. */}
          <div style={staggerStyle(1)} className="flex items-start gap-2.5">
            <Controller
              control={form.control}
              name="lastName"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="min-w-0 flex-1 gap-1.5"
                >
                  <FieldLabel htmlFor="lastName" className={authLabelClass}>
                    Last Name <RequiredMark />
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

          {/* A blank middle name is only accepted with the checkbox ticked, so
              the database can tell "has none" from "left empty". */}
          <Field
            data-invalid={!!form.formState.errors.middleName}
            style={staggerStyle(2)}
            className="gap-1.5"
          >
            <Controller
              control={form.control}
              name="middleName"
              render={({ field, fieldState }) => (
                <>
                  <FieldLabel htmlFor="middleName" className={authLabelClass}>
                    Middle Name
                    {!hasNoMiddleName && <RequiredMark />}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="middleName"
                    className={authFilledFieldClass}
                    placeholder="Santos"
                    disabled={hasNoMiddleName}
                    aria-invalid={fieldState.invalid}
                    autoComplete="additional-name"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </>
              )}
            />
            <Controller
              control={form.control}
              name="hasNoMiddleName"
              render={({ field }) => (
                <Field orientation="horizontal" className="pt-0.5">
                  <Checkbox
                    id="hasNoMiddleName"
                    checked={field.value === true}
                    onCheckedChange={(checked) => {
                      field.onChange(checked === true);
                      if (checked === true) {
                        form.setValue("middleName", "");
                      }
                      void form.trigger("middleName");
                    }}
                  />
                  <FieldLabel
                    htmlFor="hasNoMiddleName"
                    className="text-[13px] leading-snug text-body"
                  >
                    I don&apos;t have a middle name
                  </FieldLabel>
                </Field>
              )}
            />
          </Field>

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
