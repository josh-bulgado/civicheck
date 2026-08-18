import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Eye, EyeClosed, Lock, Mail, Phone, User } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
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
import { getInitials } from "~/features/account/account.types";
import { roleLabels } from "../system-admin.constants";
import type {
  AccountDetailsInput,
  AccountSummary,
  SystemAdminDepartment,
} from "../system-admin.types";

const formSchema = z
  .object({
    role: z.enum([
      "applicant",
      "staff",
      "supervisor",
      "cashier",
      "admin",
    ]),
    departmentId: z.string(),
    employmentType: z.enum(["regular", "job_order", "contractual"]),
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
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    newPassword: z
      .string()
      .refine(
        (value) => value === "" || value.length >= 8,
        "Password must be at least 8 characters",
      )
      .refine(
        (value) => value === "" || /\d/.test(value),
        "Password must include at least one number",
      ),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((values, context) => {
    if (
      (values.role === "staff" || values.role === "supervisor") &&
      !values.departmentId
    ) {
      context.addIssue({
        code: "custom",
        path: ["departmentId"],
        message: "Select a department for this role",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const roles: { value: FormValues["role"]; label: string }[] = [
  { value: "applicant", label: "Applicant (citizen)" },
  { value: "staff", label: "Staff" },
  { value: "supervisor", label: "Supervisor" },
  { value: "cashier", label: "Cashier" },
  { value: "admin", label: "CCRO Administrator" },
];

const employmentTypes: {
  value: FormValues["employmentType"];
  label: string;
}[] = [
  { value: "regular", label: "Regular" },
  { value: "job_order", label: "Job Order" },
  { value: "contractual", label: "Contractual" },
];

const sexOptions: { value: FormValues["sex"]; label: string }[] = [
  { value: "", label: "Unspecified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const passwordFields = [
  {
    name: "newPassword",
    label: "New password",
    placeholder: "Leave blank to keep the current password",
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    placeholder: "Re-enter the new password",
  },
] as const;

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function EditAccountForm({
  account,
  departments,
  isPending,
  onClose,
  onConfirm,
}: {
  account: AccountSummary;
  departments: SystemAdminDepartment[];
  isPending: boolean;
  onClose: () => void;
  onConfirm: (values: AccountDetailsInput) => Promise<boolean>;
}) {
  const [showPasswords, setShowPasswords] = useState(false);
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
      newPassword: "",
      confirmPassword: "",
      role: account.role as FormValues["role"],
      departmentId: account.departmentId ?? "",
      employmentType: account.employmentType,
    },
  });

  const selectedRole = form.watch("role");
  const requiresDepartment =
    selectedRole === "staff" || selectedRole === "supervisor";
  const isApplicant = selectedRole === "applicant";

  const displayName =
    `${account.firstName} ${account.lastName}`.trim() ||
    account.email.split("@")[0];

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
      newPassword: values.newPassword,
      role: values.role,
      departmentId: requiresDepartment ? values.departmentId : null,
      employmentType: values.employmentType,
    });

    if (succeeded) onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit account details</DialogTitle>
        <DialogDescription>
          Update this account&apos;s personal information and sign-in
          credentials. Every change is recorded in the audit history.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
            <SectionHeading
              title="Personal details"
              description="Names and contact information shown on this account's requests."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="firstName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-account-first-name">
                      First name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <User size={16} aria-hidden="true" />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="edit-account-first-name"
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
                    <FieldLabel htmlFor="edit-account-last-name">
                      Last name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id="edit-account-last-name"
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
                    <FieldLabel htmlFor="edit-account-middle-name">
                      Middle name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id="edit-account-middle-name"
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
                    <FieldLabel htmlFor="edit-account-suffix">Suffix</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id="edit-account-suffix"
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
                    <FieldLabel htmlFor="edit-account-date-of-birth">
                      Date of birth
                    </FieldLabel>
                    <DatePicker
                      id="edit-account-date-of-birth"
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      max={toDateKey()}
                      placeholder="Select a date of birth"
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
                    <FieldLabel htmlFor="edit-account-sex">Sex</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="edit-account-sex" className="w-full">
                        <SelectValue placeholder="Unspecified">
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
                  <FieldLabel htmlFor="edit-account-phone">
                    Mobile number
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Phone size={16} aria-hidden="true" />
                      <InputGroupText>+63</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="edit-account-phone"
                      inputMode="numeric"
                      placeholder="9171234567"
                      aria-invalid={fieldState.invalid}
                    />
                  </InputGroup>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription>
                      Optional. Used only for CCRO follow-ups on requests.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />

            <SectionHeading
              title="Sign-in credentials"
              description="Changing the email address updates the address this account signs in with."
            />

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-account-email">
                    Email address
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Mail size={16} aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="edit-account-email"
                      type="email"
                      autoComplete="off"
                      placeholder="resident@example.com"
                      aria-invalid={fieldState.invalid}
                    />
                  </InputGroup>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription>
                      The new address is confirmed immediately — tell the account
                      holder before you change it.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />

            {passwordFields.map((passwordField) => (
              <Controller
                key={passwordField.name}
                control={form.control}
                name={passwordField.name}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`edit-account-${passwordField.name}`}>
                      {passwordField.label}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock size={16} aria-hidden="true" />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id={`edit-account-${passwordField.name}`}
                        type={showPasswords ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={passwordField.placeholder}
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
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : passwordField.name === "newPassword" ? (
                      <FieldDescription>
                        Leave both password fields blank to keep the current
                        password.
                      </FieldDescription>
                    ) : null}
                  </Field>
                )}
              />
            ))}

            <SectionHeading
              title="Role and access"
              description="Controls what this account can reach across CiviCheck. Changes take effect on the account's next page load."
            />

            <Controller
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-account-role">Role</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="edit-account-role"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select a role">
                        {(value) =>
                          roles.find((role) => role.value === value)?.label
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : selectedRole === "admin" ? (
                    <FieldDescription>
                      Only one active CCRO Administrator is allowed. If the seat
                      is taken, hand it over with Replace CCRO Administrator
                      instead.
                    </FieldDescription>
                  ) : null}
                </Field>
              )}
            />

            {requiresDepartment ? (
              <Controller
                control={form.control}
                name="departmentId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-account-department">
                      Department
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="edit-account-department"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Select department">
                          {(value) =>
                            departments.find(
                              (department) => department.id === value,
                            )?.name
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {departments.map((department) => (
                            <SelectItem
                              key={department.id}
                              value={department.id}
                            >
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : (
                      <FieldDescription>
                        Staff and supervisors only see requests routed to their
                        own department.
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />
            ) : null}

            {isApplicant ? null : (
              <Controller
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="edit-account-employment-type">
                      Employment type
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="edit-account-employment-type"
                        className="w-full"
                      >
                        <SelectValue placeholder="Select employment type">
                          {(value) =>
                            employmentTypes.find((type) => type.value === value)
                              ?.label
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {employmentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}
          </FieldGroup>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
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
  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      {/* Square frame: only the field list scrolls, so the footer stays pinned. */}
      <DialogContent className="flex h-[min(44rem,88vh)] flex-col gap-4 overflow-hidden sm:max-w-176">
        {account ? (
          <EditAccountForm
            key={account.id}
            account={account}
            departments={departments}
            isPending={isPending}
            onClose={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
