import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AlertCircleIcon, Eye, EyeClosed, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
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
} from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";
import {
  acceptInvitationFormSchema,
  type AcceptInvitationFormValues,
} from "../accept-invitation.schema";
import { useAcceptInvitation } from "../hooks/useAcceptInvitation";

export function AcceptInvitationForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const acceptInvitation = useAcceptInvitation();
  const form = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationFormSchema),
    mode: "onBlur",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: AcceptInvitationFormValues) {
    await acceptInvitation.mutate({
      data: { password: values.password },
    });
  }

  const errorMessage = acceptInvitation.data?.error
    ? acceptInvitation.data.message
    : acceptInvitation.error instanceof Error
      ? acceptInvitation.error.message
      : undefined;
  const isPending = acceptInvitation.status === "pending";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Account setup failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className="gap-5">
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="invitation-password">Password</FieldLabel>
              <InputGroup className="h-11 bg-white">
                <InputGroupAddon>
                  <Lock aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="invitation-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  aria-describedby="password-guidance"
                  placeholder="Create a secure password"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeClosed /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription id="password-guidance">
                Use at least 8 characters. A longer, unique password is easier
                to keep secure.
              </FieldDescription>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="invitation-confirm-password">
                Confirm password
              </FieldLabel>
              <InputGroup className="h-11 bg-white">
                <InputGroupAddon>
                  <Lock aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="invitation-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter the password again"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmed password"
                        : "Show confirmed password"
                    }
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                  >
                    {showConfirmPassword ? <EyeClosed /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-lagoon text-white hover:bg-[#0D5E53]"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Spinner />
            Saving password
          </>
        ) : (
          "Complete setup"
        )}
      </Button>
    </form>
  );
}
