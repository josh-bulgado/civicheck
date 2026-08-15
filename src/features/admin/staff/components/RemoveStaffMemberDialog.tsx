import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import type { StaffMember } from "../staff.types";

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
    <Dialog
      open={staffMember !== null}
      onOpenChange={(open) => onOpenChange(open)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove this staff member?</DialogTitle>
          <DialogDescription>
            {staffMember
              ? `${staffMember.email} will lose access and their account will be permanently removed. This action cannot be undone.`
              : "This staff account will be permanently removed."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Keep staff member
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <Spinner />
                Removing
              </>
            ) : (
              "Remove staff member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
