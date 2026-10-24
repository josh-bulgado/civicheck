import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import z from "zod";
import { KeyRound, Lock, Mail, User } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { DiscardChangesDialog } from "~/components/feedback/DiscardChangesDialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { Kbd } from "~/components/ui/kbd";
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
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { toDateKey } from "~/lib/date";
import { mobileDigits } from "~/lib/phone";
import { cn } from "~/lib/utils";
import { getInitials } from "~/features/account/account.types";
import { roleLabels } from "../system-admin.constants";
import type {
  AccountDetailsInput,
  AccountSummary,
  SystemAdminDepartment,
} from "../system-admin.types";

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
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

// The fields that are plain text inputs; date of birth and sex have their own controls.
type TextFieldName = Exclude<keyof FormValues, "dateOfBirth" | "sex">;

const employmentTypeLabels: Record<string, string> = {
  regular: "Regular",
  job_order: "Job Order",
  contractual: "Contractual",
};

const sexOptions: { value: FormValues["sex"]; label: string }[] = [
  { value: "", label: "Unspecified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

// A field whose value differs from what is saved.
const dirtyFieldClass = "border-primary bg-primary-soft/40";

function TextField({
  control,
  name,
  id,
  label,
  placeholder,
  icon,
  prefix,
  description,
  transform,
  className,
  groupClassName,
  type,
  inputMode,
}: {
  control: Control<FormValues>;
  name: TextFieldName;
  id: string;
  label: ReactNode;
  placeholder?: string;
  icon?: ReactNode;
  /** Fixed text shown before the value, such as a country code. */
  prefix?: string;
  /** Helper text, shown until the field has an error. */
  description?: ReactNode;
  /** Cleans what the person types before it reaches the form. */
  transform?: (value: string) => string;
  className?: string;
  /** Extra classes for the input group, such as a background. */
  groupClassName?: string;
  type?: string;
  inputMode?: "numeric";
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <InputGroup
            size="lg"
            className={cn(
              groupClassName,
              fieldState.isDirty && dirtyFieldClass,
            )}
          >
            {icon || prefix ? (
              <InputGroupAddon>
                {icon}
                {prefix ? <InputGroupText>{prefix}</InputGroupText> : null}
              </InputGroupAddon>
            ) : null}
            <InputGroupInput
              {...field}
              onChange={(event) =>
                field.onChange(
                  transform
                    ? transform(event.target.value)
                    : event.target.value,
                )
              }
              id={id}
              type={type}
              inputMode={inputMode}
              // These are someone else's details; keep the browser from filling in the admin's own.
              autoComplete="off"
              placeholder={placeholder}
              aria-invalid={fieldState.invalid}
            />
          </InputGroup>
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
        </Field>
      )}
    />
  );
}

/**
 * Who this account is. The name follows what is typed in the form; the email
 * stays as saved, since it is what the person signs in with right now.
 */
function AccountRail({
  account,
  control,
  facts,
}: {
  account: AccountSummary;
  control: Control<FormValues>;
  facts: { label: string; value: string }[];
}) {
  const [firstName, lastName] = useWatch({
    control,
    name: ["firstName", "lastName"],
  });
  const displayName =
    `${firstName} ${lastName}`.trim() || account.email.split("@")[0];

  return (
    <aside className="flex flex-col gap-5 border-b bg-surface-subtle p-5 sm:border-r sm:border-b-0">
      <div className="flex min-w-0 flex-col items-start gap-2">
        <Avatar size="lg">
          <AvatarFallback
            className="bg-primary-soft font-bold text-primary"
            aria-label={`${displayName} initials`}
          >
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold break-words text-foreground">
            {displayName}
          </p>
          <p className="text-xs break-all text-muted-foreground">
            {account.email}
          </p>
        </div>
        <Badge variant="info">{roleLabels[account.role]}</Badge>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <dl className="flex flex-col gap-3">
          {facts.map(({ label, value }) => (
            <div key={label}>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock size={12} aria-hidden="true" />
                {label}
              </dt>
              <dd className="text-sm font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          The CCRO Administrator sets role, department and employment in Staff
          Management.
        </p>
      </div>
    </aside>
  );
}

function EditAccountForm({
  account,
  departments,
  isPending,
  paused,
  onDirtyChange,
  onRequestClose,
  onClose,
  onConfirm,
}: {
  account: AccountSummary;
  departments: SystemAdminDepartment[];
  isPending: boolean;
  /** True while another dialog is on top, so shortcuts stay quiet. */
  paused: boolean;
  onDirtyChange: (dirty: boolean) => void;
  /** Cancel: asks first when there are unsaved changes. */
  onRequestClose: () => void;
  /** After a successful save: closes without asking. */
  onClose: () => void;
  onConfirm: (values: AccountDetailsInput) => Promise<boolean>;
}) {
  const hotkeyLabel = useHotkeyLabel();
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
      email: account.email,
    },
  });

  const changeCount = Object.keys(form.formState.dirtyFields).length;
  const canSave = changeCount > 0 && !isPending;
  const saveLabel =
    changeCount === 0
      ? "Save changes"
      : `Save ${changeCount} ${changeCount === 1 ? "change" : "changes"}`;

  useEffect(() => {
    onDirtyChange(changeCount > 0);
    return () => onDirtyChange(false);
  }, [changeCount, onDirtyChange]);

  useHotkeys(
    [
      {
        hotkey: "Mod+Enter",
        callback: () => void form.handleSubmit(onSubmit)(),
      },
    ],
    { enabled: canSave && !paused, preventDefault: true },
  );

  const accountDepartment = departments.find(
    (department) => department.id === account.departmentId,
  );

  const readOnlyFacts = [
    { label: "Department", value: accountDepartment?.name ?? "—" },
    {
      label: "Employment",
      value: employmentTypeLabels[account.employmentType] ?? "—",
    },
  ];

  async function onSubmit(values: FormValues) {
    const succeeded = await onConfirm({
      targetId: account.id,
      firstName: values.firstName.trim(),
      middleName: values.middleName.trim(),
      lastName: values.lastName.trim(),
      suffix: values.suffix.trim(),
      dateOfBirth: values.dateOfBirth,
      sex: values.sex,
      phoneNumber: values.phoneNumber.trim(),
      email: values.email.trim().toLowerCase(),
    });

    if (succeeded) onClose();
  }

  return (
    <>
      <DialogHeader className="gap-1 p-6 pr-14 pb-4">
        <DialogTitle>Edit account details</DialogTitle>
        <DialogDescription>
          Update this account&apos;s personal details and sign-in email.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="grid min-h-0 flex-1 overflow-y-auto border-t sm:grid-cols-[13.5rem_minmax(0,1fr)]">
          <AccountRail
            account={account}
            control={form.control}
            facts={readOnlyFacts}
          />

          <div className="grid grid-cols-2 content-start gap-4 p-6 sm:grid-cols-6">
            <TextField
              control={form.control}
              name="firstName"
              id="edit-account-first-name"
              label="First name"
              placeholder="Juan"
              icon={<User size={16} aria-hidden="true" />}
              className="col-span-2 sm:col-span-3"
            />
            <TextField
              control={form.control}
              name="middleName"
              id="edit-account-middle-name"
              label="Middle name"
              placeholder="Optional"
              className="col-span-2 sm:col-span-3"
            />
            <TextField
              control={form.control}
              name="lastName"
              id="edit-account-last-name"
              label="Last name"
              placeholder="Dela Cruz"
              className="col-span-2 sm:col-span-4"
            />
            <TextField
              control={form.control}
              name="suffix"
              id="edit-account-suffix"
              label="Suffix"
              placeholder="Jr., III"
              className="col-span-2 sm:col-span-2"
            />

            <Controller
              control={form.control}
              name="dateOfBirth"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="sm:col-span-2"
                >
                  <FieldLabel htmlFor="edit-account-date-of-birth">
                    Date of birth
                  </FieldLabel>
                  <DatePicker
                    id="edit-account-date-of-birth"
                    size="lg"
                    icon="calendar"
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    className={cn(fieldState.isDirty && dirtyFieldClass)}
                    max={toDateKey()}
                    placeholder="Select a date"
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
              render={({ field, fieldState }) => (
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="edit-account-sex">Sex</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="edit-account-sex"
                      size="lg"
                      className={cn(
                        "w-full",
                        fieldState.isDirty && dirtyFieldClass,
                      )}
                    >
                      <SelectValue placeholder="Unspecified">
                        {(value) =>
                          sexOptions.find((option) => option.value === value)
                            ?.label
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent variant="roomy">
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

            <TextField
              control={form.control}
              name="phoneNumber"
              id="edit-account-phone"
              label="Mobile number"
              prefix="+63"
              placeholder="9171234567"
              type="tel"
              inputMode="numeric"
              transform={mobileDigits}
              className="col-span-2 sm:col-span-2"
            />

            {/* The one field that changes how this person signs in, so it gets its own tint. */}
            <div className="col-span-full rounded-xl bg-tone-warning-soft p-4">
              <TextField
                control={form.control}
                name="email"
                id="edit-account-email"
                label={
                  <>
                    <KeyRound size={16} aria-hidden="true" />
                    Sign-in email
                  </>
                }
                placeholder="resident@example.com"
                icon={<Mail size={16} aria-hidden="true" />}
                type="email"
                description="Takes effect immediately, so tell the account holder first. To set a new password, close this and use Send password reset link."
                groupClassName="bg-popover"
                className="*:data-[slot=field-description]:text-foreground/75 *:data-[slot=field-label]:text-tone-warning"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">
            Every change is recorded in the audit history.
          </p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isPending}
            onClick={onRequestClose}
          >
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={!canSave}>
            {isPending ? (
              <>
                <Spinner />
                Saving
              </>
            ) : (
              <>
                {saveLabel}
                {canSave ? (
                  <Kbd
                    aria-hidden="true"
                    className="bg-primary-foreground/20 text-primary-foreground max-sm:hidden"
                  >
                    {hotkeyLabel("Mod+Enter")}
                  </Kbd>
                ) : null}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function EditAccountDialog({
  account,
  departments,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  account: AccountSummary | null;
  departments: SystemAdminDepartment[];
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: AccountDetailsInput) => Promise<boolean>;
}) {
  const hasUnsavedChanges = useRef(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const trackDirty = useCallback((dirty: boolean) => {
    hasUnsavedChanges.current = dirty;
  }, []);

  // Esc, the X, a click outside and Cancel all land here.
  function requestClose() {
    if (hasUnsavedChanges.current && !isPending) setConfirmingDiscard(true);
    else onOpenChange(false);
  }

  function closeNow() {
    setConfirmingDiscard(false);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={account !== null}
      onOpenChange={(open) => (open ? onOpenChange(true) : requestClose())}
    >
      {/* Header and footer stay put; the rail and fields scroll only on short screens. */}
      <DialogContent className="flex max-h-[min(44rem,92vh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {account ? (
          <EditAccountForm
            key={account.id}
            account={account}
            departments={departments}
            isPending={isPending}
            paused={confirmingDiscard}
            onDirtyChange={trackDirty}
            onRequestClose={requestClose}
            onClose={closeNow}
            onConfirm={onConfirm}
          />
        ) : null}

        {/* Inside the dialog so the two stack as parent and child. */}
        <DiscardChangesDialog
          open={confirmingDiscard}
          subject="the account editor"
          onKeepEditing={() => setConfirmingDiscard(false)}
          onDiscard={closeNow}
        />
      </DialogContent>
    </Dialog>
  );
}
