import { zodResolver } from "@hookform/resolvers/zod";
import { QuietLink as Link } from "~/components/quiet-link";
import { Check, Circle, Eye, EyeClosed } from "lucide-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  newPasswordSchema,
  PASSWORD_MIN,
  PASSWORD_NUMBER_MESSAGE,
  passwordHasNumber,
} from "~/features/auth/auth.schema";
import type { AccountProfile } from "../account.types";
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
    newPassword: newPasswordSchema.refine(
      passwordHasNumber,
      PASSWORD_NUMBER_MESSAGE,
    ),
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
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
] as const;

const RULES_ID = "settings-new-password-rules";

function formatSignIn(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The rules a new password has to meet, ticked off as it is typed. */
function PasswordRules({ password }: { password: string }) {
  const rules = [
    {
      label: `At least ${PASSWORD_MIN} characters`,
      met: password.length >= PASSWORD_MIN,
    },
    { label: "At least one number", met: passwordHasNumber(password) },
  ];

  return (
    <ul id={RULES_ID} className="mt-0.5 flex flex-col gap-0.5">
      {rules.map(({ label, met }) => (
        <li
          key={label}
          className="flex items-center gap-1.5 text-[13px] leading-5 text-body-2"
        >
          {met ? (
            <Check
              className="size-3.5 shrink-0 text-success"
              aria-hidden="true"
            />
          ) : (
            <Circle className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          {label}
          <span className="sr-only">{met ? " (met)" : " (not met yet)"}</span>
        </li>
      ))}
    </ul>
  );
}

export function SettingsSecurityPanel({
  account,
  onClose,
  onDirtyChange,
}: {
  account: AccountProfile;
  onClose: () => void;
  /** Lets the dialog warn before unsaved edits are thrown away. */
  onDirtyChange: (dirty: boolean) => void;
}) {
  const changePasswordMutation = useChangePassword();
  // Each field's eye reveals only that field.
  const [revealed, setRevealed] = React.useState<
    Record<keyof FormValues, boolean>
  >({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: emptyValues,
  });

  const isDirty = form.formState.isDirty;
  React.useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const newPassword = form.watch("newPassword");
  const lastSignIn = formatSignIn(account.lastLoginAt);

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
        <div className="flex flex-col gap-5 pt-4 pb-3 md:max-w-md">
          <div>
            <p className="text-[17px] leading-6 font-bold text-foreground">
              Change your password
            </p>
            <p className="text-sm leading-5 text-body-2">
              You will be signed out of your other devices. This one stays
              signed in.
            </p>
          </div>

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
                  hint={
                    passwordField.name === "newPassword" ? (
                      <PasswordRules password={newPassword} />
                    ) : undefined
                  }
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
                      aria-describedby={
                        passwordField.name === "newPassword"
                          ? RULES_ID
                          : undefined
                      }
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
                        className="text-body-2 max-md:size-10"
                      >
                        {revealed[passwordField.name] ? (
                          <EyeClosed size={16} aria-hidden="true" />
                        ) : (
                          <Eye size={16} aria-hidden="true" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {passwordField.name === "currentPassword" ? (
                    <Link
                      to="/forgot-password"
                      className="w-fit text-[13px] leading-5 font-semibold text-primary underline-offset-2 hover:underline focus-visible:underline"
                    >
                      Forgot your current password?
                    </Link>
                  ) : null}
                </SettingsRow>
              )}
            />
          ))}

          {lastSignIn ? (
            <p className="text-[13px] leading-[18px] text-body-2">
              Last signed in {lastSignIn}.
            </p>
          ) : null}
        </div>
      </SettingsPanelBody>

      <SettingsFormFooter
        onCancel={onClose}
        canSave={isDirty}
        pending={changePasswordMutation.status === "pending"}
        submitLabel="Update password"
        pendingLabel="Updating…"
      />
    </form>
  );
}
