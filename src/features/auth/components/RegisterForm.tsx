import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { QuietLink as Link } from "~/components/quiet-link";
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
import {
  checkMiddleNameAnswer,
  PASSWORD_HINT,
  signupFieldsSchema,
} from "../auth.schema";
import { useSignUp } from "../hooks/useSignUp";
import { useOAuthLogin } from "../hooks/useOAuthLogin";
import {
  setPendingVerification,
  type PendingSignup,
} from "../pending-verification";
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
import { RequiredMark } from "~/components/ui/required-mark";
import { GoogleIcon } from "./GoogleIcon";
import { PasswordToggle } from "./PasswordToggle";

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

/** Empty fields should not leave blank validation rows in the form. */
function SignupFieldError({ error }: { error?: { message?: string } }) {
  return <FieldError errors={[error]} className="text-[13px] leading-5" />;
}

const RegisterForm = () => {
  const navigate = useNavigate();
  const signupMutation = useSignUp();
  const oauthLoginMutation = useOAuthLogin();
  const [showPassword, setShowPassword] = useState(false);

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
      // The code-entry step is its own page; this form goes with the navigation,
      // so there is nothing to reset here.
      setPendingVerification({
        email: signup.email,
        password: signup.password,
        signup,
      });
      await navigate({ to: "/verify-email" });
    }
  }

  return (
    <AuthSplitLayout
      panel={<AuthProgressPanel />}
      className="max-w-85 animate-none justify-start py-6"
    >
      <div className="flex flex-col gap-5">
        <AuthFormHeading title="Create an account" />

        {signupMutation.data?.error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Account not created</AlertTitle>
            <AlertDescription>{signupMutation.data.message}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3.5"
        >
          <Controller
            control={form.control}
            name="firstName"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
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
                <SignupFieldError error={fieldState.error} />
              </Field>
            )}
          />

          {/* Suffix modifies the surname, so it shares a row with it. */}
          <div className="flex items-start gap-2.5">
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
                  <SignupFieldError error={fieldState.error} />
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
                  <SignupFieldError error={fieldState.error} />
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
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
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
                <SignupFieldError error={fieldState.error} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
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
                <div id="password-help">
                  {fieldState.invalid ? (
                    <FieldError
                      errors={[fieldState.error]}
                      className="text-[13px] leading-5"
                    />
                  ) : (
                    <FieldDescription className="text-[13px] leading-5">
                      {PASSWORD_HINT}
                    </FieldDescription>
                  )}
                </div>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="agreeToTerms"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
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
                <SignupFieldError error={fieldState.error} />
              </Field>
            )}
          />

          <div className="flex flex-col gap-3.5">
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
