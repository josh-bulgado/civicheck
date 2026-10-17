import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Checkbox } from "~/components/ui/checkbox";
import { DatePicker } from "~/components/ui/date-picker";
import { FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { checkMiddleNameAnswer } from "~/features/auth/auth.schema";
import { toDateKey } from "~/lib/date";
import { formatLocalMobile, mobileDigits } from "~/lib/phone";
import { NO_SUFFIX, SUFFIXES } from "~/lib/subject-fields";
import { cn } from "~/lib/utils";
import type { AccountProfile } from "../account.types";
import { useUpdateProfile } from "../hooks/useUpdateProfile";
import {
  SETTINGS_CONTROL_CLASS,
  SETTINGS_PICKER_CLASS,
  SettingsFormFooter,
  SettingsRow,
} from "./settings-form";
import { SettingsAvatar } from "./SettingsAvatar";
import { SettingsPanelBody } from "./SettingsPanelBody";

const formSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    middleName: z.string().trim(),
    hasNoMiddleName: z.boolean(),
    lastName: z.string().trim().min(1, "Last name is required"),
    suffix: z.string(),
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
    // Not editable in this dialog. It rides along with its current value so
    // saving the fields above never blanks it on the profile.
    sex: z.enum(["", "male", "female"]),
  })
  .superRefine(checkMiddleNameAnswer);

type FormValues = z.infer<typeof formSchema>;

export function SettingsProfilePanel({
  account,
  onClose,
  onDirtyChange,
}: {
  account: AccountProfile;
  onClose: () => void;
  /** Lets the dialog warn before unsaved edits are thrown away. */
  onDirtyChange: (dirty: boolean) => void;
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
      hasNoMiddleName: account.hasNoMiddleName,
      suffix: account.suffix,
      sex: account.sex,
    },
  });

  const isDirty = form.formState.isDirty;
  React.useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const hasNoMiddleName = form.watch("hasNoMiddleName");

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
        <SettingsAvatar account={account} />

        <div className="grid gap-x-4 gap-y-5 pt-5 pb-3 md:grid-cols-2">
          <SettingsRow
            label="Email"
            htmlFor="profile-email"
            hint="Used to sign in and for notifications."
            className="md:col-span-2"
          >
            <Input
              id="profile-email"
              value={account.email}
              readOnly
              type="email"
              autoComplete="email"
              className={cn(SETTINGS_CONTROL_CLASS, "bg-portal-panel")}
            />
          </SettingsRow>

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
            name="middleName"
            render={({ field, fieldState }) => (
              <SettingsRow
                label="Middle name"
                htmlFor="profile-middle-name"
                required={!hasNoMiddleName}
                invalid={fieldState.invalid}
                error={fieldState.error}
              >
                <Input
                  {...field}
                  id="profile-middle-name"
                  placeholder="Santos"
                  autoComplete="additional-name"
                  disabled={hasNoMiddleName}
                  aria-invalid={fieldState.invalid}
                  className={SETTINGS_CONTROL_CLASS}
                />
                <Controller
                  control={form.control}
                  name="hasNoMiddleName"
                  render={({ field: noMiddle }) => (
                    <div className="flex min-h-8 items-center gap-2.5">
                      <Checkbox
                        id="profile-no-middle-name"
                        className="size-5 rounded-md border-(--settings-line)"
                        checked={noMiddle.value}
                        onCheckedChange={(checked) => {
                          noMiddle.onChange(checked === true);
                          if (checked === true) {
                            form.setValue("middleName", "", {
                              shouldDirty: true,
                            });
                          }
                          void form.trigger("middleName");
                        }}
                      />
                      <FieldLabel
                        htmlFor="profile-no-middle-name"
                        className="text-sm leading-snug text-foreground"
                      >
                        I don&apos;t have a middle name
                      </FieldLabel>
                    </div>
                  )}
                />
              </SettingsRow>
            )}
          />

          <Controller
            control={form.control}
            name="suffix"
            render={({ field }) => (
              <SettingsRow label="Suffix" htmlFor="profile-suffix">
                <Select
                  items={SUFFIXES}
                  value={field.value || NO_SUFFIX}
                  onValueChange={(value) =>
                    field.onChange(value === NO_SUFFIX ? "" : value)
                  }
                >
                  <SelectTrigger
                    id="profile-suffix"
                    className={cn(
                      SETTINGS_CONTROL_CLASS,
                      "w-full data-[size=default]:h-12 md:data-[size=default]:h-11",
                    )}
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
        </div>
      </SettingsPanelBody>

      <SettingsFormFooter
        onCancel={onClose}
        canSave={form.formState.isDirty}
        pending={updateMutation.status === "pending"}
      />
    </form>
  );
}
