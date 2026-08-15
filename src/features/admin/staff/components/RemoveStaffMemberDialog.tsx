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
          <DialogTitle>Deactivate this staff member?</DialogTitle>
          <DialogDescription>
            {staffMember
              ? `${staffMember.email} will lose access, but their profile and history will be preserved and can be reactivated.`
              : "This staff account will be deactivated and preserved."}
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
                Deactivating
              </>
            ) : (
              "Deactivate staff member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
