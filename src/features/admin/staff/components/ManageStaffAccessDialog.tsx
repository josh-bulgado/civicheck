import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { useUpdateStaffAccess } from "../hooks/useStaffManagementActions";
import type { Department, StaffMember } from "../staff.types";

const formSchema = z
  .object({
    role: z.enum(["staff", "supervisor", "cashier"]),
    departmentId: z.string(),
    employmentType: z.enum(["regular", "job_order", "contractual"]),
  })
  .superRefine((data, context) => {
    if (
      (data.role === "staff" || data.role === "supervisor") &&
      !data.departmentId
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
  { value: "staff", label: "Staff" },
  { value: "supervisor", label: "Supervisor" },
  { value: "cashier", label: "Cashier" },
];

const employmentTypes: {
  value: FormValues["employmentType"];
  label: string;
}[] = [
  { value: "regular", label: "Regular" },
  { value: "job_order", label: "Job Order" },
  { value: "contractual", label: "Contractual" },
];

function ManageStaffAccessForm({
  staffMember,
  departments,
  onClose,
}: {
  staffMember: StaffMember;
  departments: Department[];
  onClose: () => void;
}) {
  const updateAccess = useUpdateStaffAccess();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: staffMember.role as FormValues["role"],
      departmentId: staffMember.departmentId ?? "",
      employmentType: staffMember.employmentType,
    },
  });
  const selectedRole = form.watch("role");
  const isPending = updateAccess.status === "pending";

  async function onSubmit(values: FormValues) {
    const result = await updateAccess.mutate({
      data: {
        staffId: staffMember.id,
        role: values.role,
        departmentId:
          values.role === "staff" || values.role === "supervisor"
            ? values.departmentId
            : null,
        employmentType: values.employmentType,
      },
    });

    if (result && !result.error) onClose();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {(updateAccess.data?.error || updateAccess.error) && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {updateAccess.data?.message ||
            (updateAccess.error instanceof Error
              ? updateAccess.error.message
              : "Unable to update staff access.")}
        </div>
      )}

      <FieldGroup>
        <Controller
          control={form.control}
          name="role"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="manage-staff-role">Staff role</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="manage-staff-role"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
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
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        {selectedRole === "staff" || selectedRole === "supervisor" ? (
          <Controller
            control={form.control}
            name="departmentId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="manage-staff-department">
                  Department
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="manage-staff-department"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select a department">
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
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        ) : null}

        <Controller
          control={form.control}
          name="employmentType"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="manage-staff-employment">
                Employment type
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="manage-staff-employment"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Employment type">
                    {(value) =>
                      employmentTypes.find(
                        (employmentType) => employmentType.value === value,
                      )?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {employmentTypes.map((employmentType) => (
                      <SelectItem
                        key={employmentType.value}
                        value={employmentType.value}
                      >
                        {employmentType.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

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
              <>
                <Spinner />
                Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}

export function ManageStaffAccessDialog({
  staffMember,
  departments,
  onOpenChange,
}: {
  staffMember: StaffMember | null;
  departments: Department[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={staffMember !== null}
      onOpenChange={(open) => onOpenChange(open)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage staff access</DialogTitle>
          <DialogDescription>
            {staffMember
              ? `Update the role, department, and employment details for ${staffMember.email}.`
              : "Update this staff member's access."}
          </DialogDescription>
        </DialogHeader>
        {staffMember ? (
          <ManageStaffAccessForm
            key={staffMember.id}
            staffMember={staffMember}
            departments={departments}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
