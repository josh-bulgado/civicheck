import type { StaffMember } from "../staff.types";
import {
  StaffActionDialog,
  type StaffActionDialogCopy,
} from "./StaffActionDialog";

const cancelInvitationCopy: StaffActionDialogCopy = {
  title: "Cancel this invitation?",
  description: (staffMember) =>
    staffMember
      ? `The pending account for ${staffMember.email} will be removed and its current invitation link will stop working.`
      : "The pending account will be removed.",
  cancelLabel: "Keep invitation",
  confirmLabel: "Cancel invitation",
  pendingLabel: "Cancelling",
};

export function CancelStaffInvitationDialog({
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
      copy={cancelInvitationCopy}
      isPending={isPending}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
