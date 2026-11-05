import type { StaffMember } from "../staff.types";
import {
  StaffActionDialog,
  type StaffActionDialogCopy,
} from "./StaffActionDialog";

const deactivateStaffCopy: StaffActionDialogCopy = {
  title: "Deactivate this staff member?",
  description: (staffMember) =>
    staffMember
      ? `${staffMember.email} will lose access, but their profile and history will be preserved and can be reactivated.`
      : "This staff account will be deactivated and preserved.",
  cancelLabel: "Keep staff member",
  confirmLabel: "Deactivate staff member",
  pendingLabel: "Deactivating",
};

export function RemoveStaffMemberDialog({
  staffMember,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  staffMember: StaffMember | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <StaffActionDialog
      staffMember={staffMember}
      copy={deactivateStaffCopy}
      isPending={isPending}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
