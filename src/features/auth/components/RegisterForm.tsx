import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { QuietLink as Link } from "~/components/quiet-link";
import { AlertCircleIcon, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { InputGroup, InputGroupInput } from "~/components/ui/input-group";
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
import {
  checkMiddleNameAnswer,
  PASSWORD_MIN,
  signupFieldsSchema,
} from "../auth.schema";
import { useSignUp } from "../hooks/useSignUp";
import { useOAuthLogin } from "../hooks/useOAuthLogin";
import { useAuthLockout } from "../hooks/useAuthLockout";
import {
  setPendingVerification,
  type PendingSignup,
} from "../pending-verification";
import { Spinner } from "~/components/ui/spinner";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  authLinkClass,
  AuthFormDivider,
  AuthFormFooter,
} from "./AuthSplitLayout";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { ThemeSwitch } from "~/components/theme-switch";
import { GoogleIcon } from "./GoogleIcon";
import { PasswordToggle } from "./PasswordToggle";
import type { SignupErrorField } from "../signup-error";
import "../register.css";

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

/** Skipped fields use the outline; their explanation stays available to readers. */
function SignupFieldError({
  error,
  empty = false,
  id,
}: {
  error?: { message?: string };
  empty?: boolean;
  id?: string;
}) {
  return (
    <FieldError
      id={id}
      errors={[error]}
      className={empty ? "sr-only" : "text-[13px] leading-5"}
    />
  );
}

const RegisterForm = () => {
  const navigate = useNavigate();
  const signupMutation = useSignUp();
  const oauthLoginMutation = useOAuthLogin();
  const lockout = useAuthLockout();
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState<"email" | "google" | null>(
    null,
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const requestInFlight = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const serverErrorField = useRef<SignupErrorField | null>(null);
  const isBusy = pendingAction !== null;
  const expiredLockoutError = lockout.hasExpired &&
    [signupMutation.data, oauthLoginMutation.data].some(result => result &&
      "lockedUntil" in result && result.lockedUntil && submissionError === result.message);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
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

  const hasInlineSubmissionError =
    [form.formState.errors.email, form.formState.errors.password].some(
      error => error?.type === "server" && error.message === submissionError,
    );
  const visibleSubmissionError = lockout.message ??
    (expiredLockoutError || hasInlineSubmissionError ? null : submissionError);

  const hasNoMiddleName = form.watch("hasNoMiddleName");
  const isPasswordValid =
    signupFieldsSchema.shape.password.safeParse(form.watch("password"))
      .success && form.formState.errors.password?.type !== "server";

  useEffect(() => {
    if (!submissionError) return;
    if (serverErrorField.current) {
      form.setFocus(serverErrorField.current);
    } else {
      errorRef.current?.focus();
    }
  }, [submissionError, form]);

  function clearSubmissionError(field?: SignupErrorField) {
    if (field && serverErrorField.current !== field) return;
    if (serverErrorField.current) form.clearErrors(serverErrorField.current);
    serverErrorField.current = null;
    setSubmissionError(null);
  }

  async function onSubmit(data: FormValues) {
    if (requestInFlight.current || lockout.isLocked) return;
    requestInFlight.current = true;
    setPendingAction("email");
    clearSubmissionError();

    const signup: PendingSignup = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.hasNoMiddleName ? "" : data.middleName.trim(),
      hasNoMiddleName: data.hasNoMiddleName,
      suffix: data.suffix.trim(),
    };
    try {
      const result = await signupMutation.mutate({ data: signup });
      lockout.recordResult(result);
      if (!result || result.error) {
        const message =
          result?.message ||
          "We couldn't create your account. Check your connection and try again.";
        if (result && "field" in result && result.field) {
          serverErrorField.current = result.field;
          form.setError(result.field, { type: "server", message });
        }
        setSubmissionError(message);
        return;
      }

      // The code-entry step is its own page; this form goes with the navigation,
      // so there is nothing to reset here.
      setPendingVerification({
        email: signup.email,
        password: signup.password,
        signup,
      });
      await navigate({ to: "/verify-email" });
    } catch {
      setSubmissionError("We couldn't complete signup. Please try again.");
    } finally {
      requestInFlight.current = false;
      setPendingAction(null);
    }
  }

  async function onGoogleSignup() {
    if (requestInFlight.current || lockout.isLocked) return;
    requestInFlight.current = true;
    clearSubmissionError();
    let redirecting = false;

    try {
      if (!(await form.trigger("agreeToTerms", { shouldFocus: true }))) return;
      setPendingAction("google");
      const email = form.getValues("email");
      const result = await oauthLoginMutation.mutate({
        provider: "google",
        email: z.string().email().safeParse(email).success ? email : undefined,
      });
      lockout.recordResult(result);
      if (!result || result.error || !result.url) {
        setSubmissionError(
          result?.message ||
            "We couldn't connect to Google. Check your connection and try again.",
        );
        return;
      }
      redirecting = true;
    } finally {
      // Keep both actions locked while the browser leaves for Google.
      if (!redirecting) {
        requestInFlight.current = false;
        setPendingAction(null);
      }
    }
  }

  return (
    <div className="auth-scope register-page">
      <main className="register-container">
        <header className="register-header">
          <div className="register-navigation">
            <Link
              to="/login"
              aria-label="Back to sign in"
              className="register-back"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Link>
            <ThemeSwitch />
          </div>
          <Link to="/" aria-label="CiviCheck home" className="register-home">
            <CiviCheckIdentity compact />
          </Link>
          <h1 className="register-title">Create your account</h1>
        </header>

        <form
          noValidate
          aria-busy={isBusy}
          onSubmit={form.handleSubmit(onSubmit)}
          className="register-form"
        >
          {visibleSubmissionError && (
            <Alert ref={errorRef} tabIndex={-1} variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Unable to sign up</AlertTitle>
              <AlertDescription>{visibleSubmissionError}</AlertDescription>
            </Alert>
          )}

          <FieldSet disabled={isBusy} className="register-fields">
            <FieldSet className="gap-3">
              <FieldLegend className="register-label mb-0">Name</FieldLegend>
              <div className="register-name-row">
                <Controller
                  control={form.control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                      className="gap-1.5"
                    >
                      <FieldLabel htmlFor="firstName" className="sr-only">
                        First name
                      </FieldLabel>
                      <Input
                        {...field}
                        id="firstName"
                        placeholder="First name"
                        aria-invalid={fieldState.invalid}
                        aria-describedby={
                          fieldState.invalid ? "firstName-error" : undefined
                        }
                        autoComplete="given-name"
                        fieldSize="touch"
                        shape="soft"
                        className="register-input"
                        aria-required="true"
                      />
                      <SignupFieldError
                        id="firstName-error"
                        error={fieldState.error}
                        empty={!field.value.trim()}
                      />
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
                      <FieldLabel htmlFor="lastName" className="sr-only">
                        Last name
                      </FieldLabel>
                      <Input
                        {...field}
                        id="lastName"
                        placeholder="Last name"
                        aria-invalid={fieldState.invalid}
                        aria-describedby={
                          fieldState.invalid ? "lastName-error" : undefined
                        }
                        autoComplete="family-name"
                        fieldSize="touch"
                        shape="soft"
                        className="register-input"
                        aria-required="true"
                      />
                      <SignupFieldError
                        id="lastName-error"
                        error={fieldState.error}
                        empty={!field.value.trim()}
                      />
                    </Field>
                  )}
                />
              </div>

              {/* A blank middle name is only accepted with the checkbox ticked, so
              the database can tell "has none" from "left empty". */}
              <div className="register-middle-row">
                <Field
                  data-invalid={!!form.formState.errors.middleName}
                  className="gap-1.5"
                >
                  <Controller
                    control={form.control}
                    name="middleName"
                    render={({ field, fieldState }) => (
                      <>
                        <FieldLabel htmlFor="middleName" className="sr-only">
                          Middle name
                        </FieldLabel>
                        <Input
                          {...field}
                          id="middleName"
                          placeholder="Middle name"
                          disabled={hasNoMiddleName}
                          aria-invalid={fieldState.invalid}
                          aria-describedby={
                            fieldState.invalid ? "middleName-error" : undefined
                          }
                          autoComplete="additional-name"
                          fieldSize="touch"
                          shape="soft"
                          className="register-input"
                          aria-required={!hasNoMiddleName}
                        />
                        <SignupFieldError
                          id="middleName-error"
                          error={fieldState.error}
                          empty={!field.value.trim()}
                        />
                      </>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="hasNoMiddleName"
                    render={({ field }) => (
                      <Field
                        orientation="horizontal"
                        className="register-checkbox-row"
                      >
                        <Checkbox
                          id="hasNoMiddleName"
                          disabled={isBusy}
                          ref={field.ref}
                          onBlur={field.onBlur}
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
                          className="register-checkbox-label"
                        >
                          No middle name
                        </FieldLabel>
                      </Field>
                    )}
                  />
                </Field>

                <Controller
                  control={form.control}
                  name="suffix"
                  render={({ field }) => (
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="suffix" className="sr-only">
                        Suffix
                      </FieldLabel>
                      <Select
                        disabled={isBusy}
                        items={SUFFIXES}
                        value={field.value || NO_SUFFIX}
                        onValueChange={(value) =>
                          field.onChange(value === NO_SUFFIX ? "" : value)
                        }
                      >
                        <SelectTrigger
                          id="suffix"
                          ref={field.ref}
                          onBlur={field.onBlur}
                          size="touch"
                          shape="soft"
                          className="register-input"
                        >
                          <span className="register-suffix-value">
                            <span
                              className="register-suffix-caption"
                              aria-hidden="true"
                            >
                              Suffix
                            </span>
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {SUFFIXES.map((suffix) => (
                              <SelectItem
                                key={suffix.value}
                                value={suffix.value}
                              >
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
            </FieldSet>

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor="email" className="register-label">
                    Email
                  </FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    onChange={(event) => {
                      field.onChange(event);
                      clearSubmissionError("email");
                    }}
                    type="email"
                    placeholder="Enter your email"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? "email-error" : undefined
                    }
                    autoComplete="email"
                    fieldSize="touch"
                    shape="soft"
                    className="register-input"
                    aria-required="true"
                  />
                  <SignupFieldError
                    id="email-error"
                    error={fieldState.error}
                    empty={!field.value.trim()}
                  />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor="password" className="register-label">
                    Password
                  </FieldLabel>
                  <InputGroup
                    fieldSize="touch"
                    shape="soft"
                    className="register-input"
                  >
                    <InputGroupInput
                      {...field}
                      id="password"
                      onChange={(event) => {
                        field.onChange(event);
                        clearSubmissionError("password");
                      }}
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={
                        isPasswordValid ? undefined : "password-help"
                      }
                      autoComplete="new-password"
                      aria-required="true"
                    />
                    <PasswordToggle
                      shown={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                    />
                  </InputGroup>
                  <div
                    id="password-help"
                    className="register-password-help"
                    aria-hidden={isPasswordValid || undefined}
                  >
                    {!isPasswordValid && fieldState.invalid && (
                      <SignupFieldError
                        error={fieldState.error}
                        empty={!field.value.trim()}
                      />
                    )}
                    <FieldDescription
                      className="register-password-hint text-[13px] leading-5"
                      data-hidden={
                        isPasswordValid ||
                        (fieldState.invalid && !!field.value.trim())
                      }
                    >
                      {PASSWORD_MIN}+ characters with uppercase, lowercase, a
                      number and a symbol.
                    </FieldDescription>
                  </div>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="agreeToTerms"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <Field
                    orientation="horizontal"
                    className="register-checkbox-row"
                  >
                    <Checkbox
                      id="agreeToTerms"
                      disabled={isBusy}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      checked={field.value === true}
                      onCheckedChange={(checked) =>
                        form.setValue("agreeToTerms", checked === true, {
                          shouldValidate: true,
                          shouldTouch: true,
                        })
                      }
                      aria-invalid={fieldState.invalid}
                      aria-describedby={
                        fieldState.invalid ? "consent-error" : undefined
                      }
                    />
                    <FieldLabel
                      htmlFor="agreeToTerms"
                      className="register-checkbox-label register-consent"
                    >
                      I agree to the{" "}
                      <LegalDialogLink
                        document="terms"
                        className={authLinkClass}
                      >
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
                  <SignupFieldError
                    id="consent-error"
                    error={fieldState.error}
                  />
                </Field>
              )}
            />
          </FieldSet>

          <div className="flex flex-col gap-3.5">
            <Button
              type="submit"
              size="touch"
              shape="pill"
              className="register-action"
              disabled={isBusy || lockout.isLocked}
            >
              {pendingAction === "email" ? (
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
              type="button"
              variant="outline"
              size="touch"
              shape="pill"
              className="register-action register-google"
              onClick={onGoogleSignup}
              disabled={isBusy || lockout.isLocked}
            >
              {pendingAction === "google" ? (
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
      </main>
    </div>
  );
};

export default RegisterForm;
