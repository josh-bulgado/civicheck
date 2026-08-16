import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Eye, EyeClosed, Lock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DialogFooter } from "~/components/ui/dialog";
import {
  Field,
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
import { useChangePassword } from "../hooks/useChangePassword";
import { SettingsPanelBody } from "./SettingsPanelBody";

const formSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Your new password must be different from your current password",
    path: ["newPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

const emptyValues: FormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const passwordFields = [
  {
    name: "currentPassword",
    label: "Current password",
    placeholder: "Your current password",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "New password",
    placeholder: "At least 8 characters, including a number",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    placeholder: "Re-enter your new password",
    autoComplete: "new-password",
  },
] as const;

export function SettingsPasswordPanel({ onClose }: { onClose: () => void }) {
  const changePasswordMutation = useChangePassword();
  const [showPasswords, setShowPasswords] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: emptyValues,
  });

  async function onSubmit(data: FormValues) {
    const result = await changePasswordMutation.mutate({
      data: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
    });

    if (result && !result.error) {
      form.reset(emptyValues);
      onClose();
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <SettingsPanelBody>
        <FieldGroup className="gap-5">
          <p className="text-xs text-muted-foreground">
            Enter your current password to confirm it's you. You will stay
            signed in on this device afterwards.
          </p>

          {passwordFields.map((passwordField) => (
            <Controller
              key={passwordField.name}
              control={form.control}
              name={passwordField.name}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`settings-${passwordField.name}`}>
                    {passwordField.label}
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Lock size={16} aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id={`settings-${passwordField.name}`}
                      type={showPasswords ? "text" : "password"}
                      placeholder={passwordField.placeholder}
                      autoComplete={passwordField.autoComplete}
                      aria-invalid={fieldState.invalid}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-xs"
                        onClick={() => setShowPasswords((shown) => !shown)}
                        aria-label={
                          showPasswords ? "Hide passwords" : "Show passwords"
                        }
                      >
                        {showPasswords ? (
                          <EyeClosed size={16} aria-hidden="true" />
                        ) : (
                          <Eye size={16} aria-hidden="true" />
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
          ))}
        </FieldGroup>
      </SettingsPanelBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={changePasswordMutation.status === "pending"}
        >
          {changePasswordMutation.status === "pending" ? (
            <span className="flex items-center gap-2">
              <Spinner className="size-4" />
              Updating...
            </span>
          ) : (
            "Update password"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
