import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
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
import { roleLabels } from "../system-admin.constants";
import type {
  AdminCandidate,
  SystemAdminDepartment,
} from "../system-admin.types";

const formSchema = z
  .object({
    candidateId: z.string().min(1, "Select an active staff member"),
    outgoingRole: z.enum(["staff", "supervisor", "cashier"]),
    outgoingDepartmentId: z.string(),
  })
  .superRefine((values, context) => {
    const requiresDepartment =
      values.outgoingRole === "staff" || values.outgoingRole === "supervisor";

    if (requiresDepartment && !values.outgoingDepartmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a department",
        path: ["outgoingDepartmentId"],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;
type OutgoingRole = FormValues["outgoingRole"];

const outgoingRoles: { value: OutgoingRole; label: string }[] = [
  { value: "staff", label: "Staff" },
  { value: "supervisor", label: "Supervisor" },
  { value: "cashier", label: "Cashier" },
];

function ReplaceCcroAdminForm({
  adminCandidates,
  departments,
  isPending,
  onClose,
  onConfirm,
}: {
  adminCandidates: AdminCandidate[];
  departments: SystemAdminDepartment[];
  isPending: boolean;
  onClose: () => void;
  onConfirm: (values: {
    candidateId: string;
    outgoingRole: OutgoingRole;
    outgoingDepartmentId: string | null;
  }) => Promise<boolean>;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      candidateId: "",
      outgoingRole: "staff",
      outgoingDepartmentId: "",
    },
  });
  const selectedRole = form.watch("outgoingRole");
  const requiresDepartment =
    selectedRole === "staff" || selectedRole === "supervisor";
  const candidateItems = adminCandidates.map((candidate) => ({
    label: `${candidate.firstName} ${candidate.lastName} — ${roleLabels[candidate.role]}`,
    value: candidate.id,
  }));

  async function onSubmit(data: FormValues) {
    const succeeded = await onConfirm({
      candidateId: data.candidateId,
      outgoingRole: data.outgoingRole,
      outgoingDepartmentId: requiresDepartment
        ? data.outgoingDepartmentId
        : null,
    });

    if (succeeded) {
      form.reset();
      onClose();
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Replace CCRO Administrator</DialogTitle>
        <DialogDescription>
          The selected active staff member is promoted and the current
          administrator is reassigned in one database transaction.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="candidateId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="incoming-administrator">
                  Incoming administrator
                </FieldLabel>
                <Select
                  items={candidateItems}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="incoming-administrator"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue
                      placeholder="Select active staff"
                      className="capitalize"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {candidateItems.map((candidate) => (
                        <SelectItem key={candidate.value} value={candidate.value}>
                          {candidate.label}
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

          <Controller
            control={form.control}
            name="outgoingRole"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="outgoing-role">
                  Outgoing administrator&apos;s new role
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="outgoing-role"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue
                      placeholder="Select a role"
                      className="capitalize"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {outgoingRoles.map((role) => (
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

          {requiresDepartment ? (
            <Controller
              control={form.control}
              name="outgoingDepartmentId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="outgoing-department">
                    Outgoing administrator&apos;s department
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="outgoing-department"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue
                        placeholder="Select department"
                        className="capitalize"
                      />
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
                  Replacing...
                </span>
              ) : (
                "Confirm replacement"
              )}
            </Button>
          </DialogFooter>
        </FieldGroup>
      </form>
    </>
  );
}

export function ReplaceCcroAdminDialog({
  open,
  adminCandidates,
  departments,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  adminCandidates: AdminCandidate[];
  departments: SystemAdminDepartment[];
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: {
    candidateId: string;
    outgoingRole: OutgoingRole;
    outgoingDepartmentId: string | null;
  }) => Promise<boolean>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <ReplaceCcroAdminForm
            adminCandidates={adminCandidates}
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
