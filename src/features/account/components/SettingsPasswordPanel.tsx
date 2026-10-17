import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Eye, EyeClosed } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import { useChangePassword } from "../hooks/useChangePassword";
import {
  SETTINGS_GROUP_CLASS,
  SettingsFormFooter,
  SettingsRow,
} from "./settings-form";
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
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "New password",
    autoComplete: "new-password",
    hint: "At least 8 characters, including a number.",
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
] as const;

export function SettingsPasswordPanel({ onClose }: { onClose: () => void }) {
  const changePasswordMutation = useChangePassword();
  // Each field's eye reveals only that field.
  const [revealed, setRevealed] = React.useState<Record<keyof FormValues, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

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
      className="flex min-h-0 flex-1 flex-col"
    >
      <SettingsPanelBody>
        {passwordFields.map((passwordField) => (
          <Controller
            key={passwordField.name}
            control={form.control}
            name={passwordField.name}
            render={({ field, fieldState }) => (
              <SettingsRow
                label={passwordField.label}
                htmlFor={`settings-${passwordField.name}`}
                required
                hint={"hint" in passwordField ? passwordField.hint : undefined}
                invalid={fieldState.invalid}
                error={fieldState.error}
              >
                <InputGroup className={SETTINGS_GROUP_CLASS}>
                  <InputGroupInput
                    {...field}
                    id={`settings-${passwordField.name}`}
                    type={revealed[passwordField.name] ? "text" : "password"}
                    autoComplete={passwordField.autoComplete}
                    aria-invalid={fieldState.invalid}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-sm"
                      onClick={() =>
                        setRevealed((current) => ({
                          ...current,
                          [passwordField.name]: !current[passwordField.name],
                        }))
                      }
                      aria-label={`${
                        revealed[passwordField.name] ? "Hide" : "Show"
                      } ${passwordField.label.toLowerCase()}`}
                      aria-pressed={revealed[passwordField.name]}
                      className="text-muted-2"
                    >
                      {revealed[passwordField.name] ? (
                        <EyeClosed size={16} aria-hidden="true" />
                      ) : (
                        <Eye size={16} aria-hidden="true" />
                      )}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </SettingsRow>
            )}
          />
        ))}
      </SettingsPanelBody>

      <SettingsFormFooter
        onCancel={onClose}
        canSave={form.formState.isDirty}
        pending={changePasswordMutation.status === "pending"}
      />
    </form>
  );
}
