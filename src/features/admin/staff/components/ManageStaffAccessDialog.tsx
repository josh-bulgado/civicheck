import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { FieldGroup } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { useUpdateStaffAccess } from "../hooks/useStaffManagementActions";
import {
  ASSIGNABLE_ROLE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  roleNeedsDepartment,
} from "../staff-form.options";
import type { Department, StaffMember } from "../staff.types";
import { StaffSelectField } from "./StaffSelectField";

const formSchema = z
  .object({
    role: z.enum(["staff", "supervisor", "cashier"]),
    departmentId: z.string(),
    employmentType: z.enum(["regular", "job_order", "contractual"]),
  })
  .superRefine((data, context) => {
    if (roleNeedsDepartment(data.role) && !data.departmentId) {
      context.addIssue({
        code: "custom",
        path: ["departmentId"],
        message: "Select a department for this role",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

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
  const departmentOptions = departments.map((department) => ({
    value: department.id,
    label: department.name,
  }));
  const isPending = updateAccess.status === "pending";

  async function onSubmit(values: FormValues) {
    const result = await updateAccess.mutate({
      data: {
        staffId: staffMember.id,
        role: values.role,
        departmentId: roleNeedsDepartment(values.role)
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
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {updateAccess.data?.message ||
              (updateAccess.error instanceof Error
                ? updateAccess.error.message
                : "Unable to update staff access.")}
          </AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <StaffSelectField
          control={form.control}
          name="role"
          id="manage-staff-role"
          label="Staff role"
          placeholder="Role"
          options={ASSIGNABLE_ROLE_OPTIONS}
        />

        {roleNeedsDepartment(selectedRole) ? (
          <StaffSelectField
            control={form.control}
            name="departmentId"
            id="manage-staff-department"
            label="Department"
            placeholder="Select a department"
            options={departmentOptions}
          />
        ) : null}

        <StaffSelectField
          control={form.control}
          name="employmentType"
          id="manage-staff-employment"
          label="Employment type"
          placeholder="Employment type"
          options={EMPLOYMENT_TYPE_OPTIONS}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
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
