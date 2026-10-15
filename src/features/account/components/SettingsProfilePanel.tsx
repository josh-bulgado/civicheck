import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { toDateKey } from "~/lib/date";
import { formatLocalMobile, mobileDigits } from "~/lib/phone";
import type { AccountProfile } from "../account.types";
import { useUpdateProfile } from "../hooks/useUpdateProfile";
import {
  SETTINGS_CONTROL_CLASS,
  SETTINGS_PICKER_CLASS,
  SettingsFormFooter,
  SettingsRow,
} from "./settings-form";
import { SettingsPanelBody } from "./SettingsPanelBody";

const formSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z
    .string()
    .min(1, "Birth date is required")
    .refine(
      (value) => new Date(`${value}T00:00:00`) <= new Date(),
      "Birth date cannot be in the future",
    ),
  // Held as the ten digits after the leading 0 and shown as "0917 123 4567".
  phoneNumber: z
    .string()
    .min(1, "Contact number is required")
    .regex(/^9\d{9}$/, "Enter a valid mobile number, e.g. 0917 123 4567"),
  // Not editable in this dialog. They ride along with their current values so
  // saving the fields above never blanks them on the profile.
  middleName: z.string(),
  suffix: z.string(),
  sex: z.enum(["", "male", "female"]),
});

type FormValues = z.infer<typeof formSchema>;

export function SettingsProfilePanel({
  account,
  onClose,
}: {
  account: AccountProfile;
  onClose: () => void;
}) {
  const updateMutation = useUpdateProfile();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: account.firstName,
      lastName: account.lastName,
      dateOfBirth: account.dateOfBirth,
      phoneNumber: account.phoneNumber,
      middleName: account.middleName,
      suffix: account.suffix,
      sex: account.sex,
    },
  });

  async function onSubmit(data: FormValues) {
    const result = await updateMutation.mutate({ data });
    if (result && !result.error) onClose();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SettingsPanelBody>
        <Controller
          control={form.control}
          name="firstName"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="First name"
              htmlFor="profile-first-name"
              required
              invalid={fieldState.invalid}
              error={fieldState.error}
            >
              <Input
                {...field}
                id="profile-first-name"
                placeholder="Juan"
                autoComplete="given-name"
                aria-invalid={fieldState.invalid}
                className={SETTINGS_CONTROL_CLASS}
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="lastName"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Last name"
              htmlFor="profile-last-name"
              required
              invalid={fieldState.invalid}
              error={fieldState.error}
            >
              <Input
                {...field}
                id="profile-last-name"
                placeholder="Dela Cruz"
                autoComplete="family-name"
                aria-invalid={fieldState.invalid}
                className={SETTINGS_CONTROL_CLASS}
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="dateOfBirth"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Birth date"
              htmlFor="profile-date-of-birth"
              required
              invalid={fieldState.invalid}
              error={fieldState.error}
            >
              <DatePicker
                id="profile-date-of-birth"
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                max={toDateKey()}
                placeholder="Select your birth date"
                invalid={fieldState.invalid}
                clearable={false}
                icon="none"
                className={SETTINGS_PICKER_CLASS}
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="phoneNumber"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Contact number"
              htmlFor="profile-phone"
              required
              invalid={fieldState.invalid}
              error={fieldState.error}
            >
              <Input
                {...field}
                value={formatLocalMobile(field.value)}
                onChange={(event) =>
                  field.onChange(mobileDigits(event.target.value))
                }
                id="profile-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="0917 123 4567"
                aria-invalid={fieldState.invalid}
                className={SETTINGS_CONTROL_CLASS}
              />
            </SettingsRow>
          )}
        />
      </SettingsPanelBody>

      <SettingsFormFooter
        onCancel={onClose}
        canSave={form.formState.isDirty}
        pending={updateMutation.status === "pending"}
      />
    </form>
  );
}
