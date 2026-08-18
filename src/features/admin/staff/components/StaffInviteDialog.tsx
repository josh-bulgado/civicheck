import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { Mail, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";
import type { Department, EmploymentType } from "../staff.types";
import { useInviteStaff } from "../hooks/useInviteStaff";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["staff", "supervisor", "cashier"]),
  departmentId: z.string(),
  employmentType: z.enum(["regular", "job_order", "contractual"]),
});

type FormValues = z.infer<typeof formSchema>;

const roles: { value: FormValues["role"]; label: string }[] = [
  { value: "staff", label: "Staff" },
  { value: "supervisor", label: "Supervisor" },
  { value: "cashier", label: "Cashier" },
];
const employmentTypes: { value: EmploymentType; label: string }[] = [
  { value: "regular", label: "Regular" },
  { value: "job_order", label: "Job Order" },
  { value: "contractual", label: "Contractual" },
];

export function StaffInviteDialog({
  open,
  onOpenChange,
  departments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
}) {
  const inviteMutation = useInviteStaff();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "staff",
      departmentId: departments[0]?.id ?? "",
      employmentType: "regular",
    },
  });
  const selectedRole = form.watch("role");

  async function onSubmit(data: FormValues) {
    const result = await inviteMutation.mutate({
      data: { ...data, departmentId: data.departmentId || null },
    });

    if (result && !result.error) {
      form.reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>
            Send an invitation email and assign an internal role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {(inviteMutation.data?.error || inviteMutation.error) && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {inviteMutation.data?.message ||
                (inviteMutation.error instanceof Error
                  ? inviteMutation.error.message
                  : "Unable to send invitation. Please try again.")}
            </div>
          )}
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="firstName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="staff-firstName">
                      First Name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <User size={16} aria-hidden="true" />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="staff-firstName"
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
                    <FieldLabel htmlFor="staff-lastName">Last Name</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id="staff-lastName"
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
            </div>

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="staff-email">Email</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Mail size={16} aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="staff-email"
                      type="email"
                      placeholder="you@example.com"
                      aria-invalid={fieldState.invalid}
                      autoComplete="on"
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
              name="role"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="staff-role">Staff Role</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="staff-role">
                      <SelectValue placeholder="Role">
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            {(selectedRole === "staff" || selectedRole === "supervisor") && (
              <Controller
                control={form.control}
                name="departmentId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="staff-department">
                      Department
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="staff-department"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Department">
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
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}
            <Controller
              control={form.control}
              name="employmentType"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="staff-employment-type">
                    Employment Type
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="staff-employment-type"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Employment type">
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.status === "pending"}
              >
                {inviteMutation.status === "pending" ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-4" />
                    Sending invitation...
                  </span>
                ) : (
                  "Send invitation"
                )}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
