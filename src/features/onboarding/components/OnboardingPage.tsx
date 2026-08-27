import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { UserRound } from "lucide-react";
import z from "zod";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { InputGroup, InputGroupInput } from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";
import type { AccountProfile } from "~/features/account/account.types";
import { useCompleteOnboarding } from "../hooks/useCompleteOnboarding";

const formSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function OnboardingPage({ user }: { user: AccountProfile }) {
  const completeOnboarding = useCompleteOnboarding();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });

  async function onSubmit(data: FormValues) {
    await completeOnboarding.mutate({
      data: {
        firstName: data.firstName,
        middleName: "",
        lastName: data.lastName,
        suffix: "",
        dateOfBirth: "",
        sex: "",
        phoneNumber: "",
      },
    });
  }

  return (
    <div className="auth-page flex min-h-dvh items-center justify-center bg-background px-5 py-10 sm:px-8">
      <section className="w-full max-w-[440px]" aria-labelledby="onboarding-title">
        <div className="mb-7 text-center">
          <Link to="/" className="mb-5 inline-flex">
            <CiviCheckIdentity />
          </Link>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
            <UserRound className="size-3.5" />
            One more step
          </div>
          <h1 id="onboarding-title" className="civic-title text-3xl">
            Confirm your name
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We couldn't get a full name from your Google account. Confirm or
            correct it below so CCRO staff can identify your requests.
          </p>
        </div>

        <div className="civic-card p-5 sm:p-7">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <FieldGroup className="gap-4">
              <Controller
                control={form.control}
                name="firstName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="onboarding-first-name">
                      First name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id="onboarding-first-name"
                        placeholder="Juan"
                        autoFocus
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
                    <FieldLabel htmlFor="onboarding-last-name">
                      Last name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id="onboarding-last-name"
                        placeholder="Dela Cruz"
                        aria-invalid={fieldState.invalid}
                      />
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button type="submit" disabled={completeOnboarding.status === "pending"}>
              {completeOnboarding.status === "pending" ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  Saving...
                </span>
              ) : (
                "Continue to dashboard"
              )}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
