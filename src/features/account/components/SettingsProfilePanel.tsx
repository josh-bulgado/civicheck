import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Mail, Phone, User } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { DialogFooter } from "~/components/ui/dialog";
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
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { toDateKey } from "~/lib/date";
import { roleLabels } from "~/features/system-admin/system-admin.constants";
import {
  getDisplayName,
  getInitials,
  type AccountProfile,
} from "../account.types";
import { useUpdateProfile } from "../hooks/useUpdateProfile";
import { SettingsPanelBody } from "./SettingsPanelBody";

const formSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  middleName: z.string(),
  lastName: z.string().trim().min(1, "Last name is required"),
  suffix: z.string(),
  dateOfBirth: z
    .string()
    .refine(
      (value) => value === "" || new Date(`${value}T00:00:00`) <= new Date(),
      "Date of birth cannot be in the future",
    ),
  sex: z.enum(["", "male", "female"]),
  phoneNumber: z
    .string()
    .refine(
      (value) => value === "" || /^9\d{9}$/.test(value),
      "Enter a valid 10-digit mobile number, e.g. 9171234567",
    ),
});

type FormValues = z.infer<typeof formSchema>;

const sexOptions: { value: FormValues["sex"]; label: string }[] = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

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
      middleName: account.middleName,
      lastName: account.lastName,
      suffix: account.suffix,
      dateOfBirth: account.dateOfBirth,
      sex: account.sex,
      phoneNumber: account.phoneNumber,
    },
  });

  const displayName = getDisplayName(account);

  async function onSubmit(data: FormValues) {
    const result = await updateMutation.mutate({ data });
    if (result && !result.error) onClose();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <SettingsPanelBody>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-subtle p-3">
          <Avatar className="size-11 shrink-0">
            <AvatarFallback
              className="bg-primary-soft font-bold text-primary"
              aria-label={`${displayName} initials`}
            >
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <Mail size={12} aria-hidden="true" />
              {account.email}
            </p>
          </div>
          <Badge variant="info" className="shrink-0">
            {roleLabels[account.role]}
          </Badge>
        </div>

        <FieldGroup className="mt-5 gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-first-name">
                    First name
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <User size={16} aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="profile-first-name"
                      placeholder="Juan"
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
                  <FieldLabel htmlFor="profile-last-name">Last name</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="profile-last-name"
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

            <Controller
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="profile-middle-name">
                    Middle name
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="profile-middle-name"
                      placeholder="Optional"
                    />
                  </InputGroup>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="suffix"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="profile-suffix">Suffix</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="profile-suffix"
                      placeholder="Jr., III — optional"
                    />
                  </InputGroup>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="dateOfBirth"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-date-of-birth">
                    Date of birth
                  </FieldLabel>
                  <DatePicker
                    id="profile-date-of-birth"
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    max={toDateKey()}
                    placeholder="Select your date of birth"
                    invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="sex"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="profile-sex">Sex</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="profile-sex" className="w-full">
                      <SelectValue placeholder="Prefer not to say">
                        {(value) =>
                          sexOptions.find((option) => option.value === value)
                            ?.label
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {sexOptions.map((option) => (
                          <SelectItem
                            key={option.value || "unspecified"}
                            value={option.value}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="phoneNumber"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-phone">Mobile number</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Phone size={16} aria-hidden="true" />
                    <InputGroupText>+63</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    id="profile-phone"
                    inputMode="numeric"
                    placeholder="9171234567"
                    aria-invalid={fieldState.invalid}
                  />
                </InputGroup>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <FieldDescription>
                    Optional. Used only for CCRO follow-ups on your requests.
                  </FieldDescription>
                )}
              </Field>
            )}
          />
        </FieldGroup>
      </SettingsPanelBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.status === "pending"}>
          {updateMutation.status === "pending" ? (
            <span className="flex items-center gap-2">
              <Spinner className="size-4" />
              Saving...
            </span>
          ) : (
            "Save changes"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
