import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { Check, Eye, EyeClosed, Mail, User, Lock } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Checkbox } from "~/components/ui/checkbox";
import { useSignUp } from "../hooks/useSignUp";
import { Spinner } from "~/components/ui/spinner";
import { Button } from "~/components/ui/button";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { AuthBrandPanel } from "./AuthBrandPanel";
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

function passwordStrength(password: string) {
  const rules = [
    password.length >= 8,
    /\d/.test(password),
    /[a-z]/.test(password),
    /[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password),
  ];
  return rules.filter(Boolean).length;
}

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
  const strength = passwordStrength(password);
  const meetsMinRule = password.length >= 8 && /\d/.test(password);

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
    <div className="flex min-h-dvh">
      <AuthBrandPanel
        title="One account for every CCRO request."
        description="Your details are saved once, so the next request only takes a minute to file."
        steps={[
          {
            title: "Create your account",
            description: "Takes about a minute — no documents needed yet.",
          },
          {
            title: "File your request online",
            description: "Upload your documents and pick a queue slot.",
          },
          {
            title: "Visit once to pay and claim",
            description: "Settle the fee at the cashier and receive your document.",
          },
        ]}
      />

      <div className="flex flex-1 flex-col items-center bg-background px-6 py-12">
        <div className="my-auto w-full max-w-113 shrink-0 space-y-5">
          <Link to="/" className="mb-2 inline-flex lg:hidden">
            <CiviCheckIdentity />
          </Link>

          <div className="space-y-2">
            <h1 className="civic-title text-[32px]">Create your account</h1>
            <p className="text-[17px] leading-normal text-muted-2">
              Use the name that appears on your valid ID.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {signupMutation.data?.error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {signupMutation.data.message}
              </div>
            )}
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3.5">
                <Controller
                  control={form.control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="firstName">First name</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <User size={16} aria-hidden="true" />
                        </InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          id="firstName"
                          placeholder="Juan"
                          aria-invalid={fieldState.invalid}
                          autoComplete="given-name"
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
                      <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                      <Input
                        {...field}
                        id="lastName"
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

              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email address</FieldLabel>
                    <InputGroup>
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
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : (
                      <FieldDescription>
                        We send request updates here — no spam.
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="mobileNumber"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="mobileNumber">Mobile number</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText className="font-bold text-body-strong">+63</InputGroupText>
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
                          field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                      />
                    </InputGroup>
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : (
                      <FieldDescription>
                        Used for queue reminders on the day of your visit.
                      </FieldDescription>
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
                        autoComplete="new-password"
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

                    <div className="flex gap-1.5 pt-0.5">
                      {[0, 1, 2, 3].map((segment) => (
                        <div
                          key={segment}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            segment < strength ? "bg-success" : "bg-border-strong",
                          )}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Check
                        size={16}
                        strokeWidth={3}
                        className={meetsMinRule ? "text-success" : "text-muted-foreground"}
                      />
                      <span
                        className={cn(
                          "text-[15px]",
                          meetsMinRule ? "text-body" : "text-muted-foreground",
                        )}
                      >
                        At least 8 characters, with one number
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
                      <label htmlFor="agreeToTerms" className="text-[16px] leading-snug text-body">
                        I agree to the{" "}
                        <Link to="/" className="font-bold text-primary hover:text-primary-hover">
                          Terms of Use
                        </Link>{" "}
                        and{" "}
                        <Link to="/" className="font-bold text-primary hover:text-primary-hover">
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
                className="w-full text-base"
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

          <Separator />

          <p className="text-[17px] text-body">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-primary hover:text-primary-hover">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
