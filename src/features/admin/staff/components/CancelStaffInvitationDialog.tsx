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
    <Dialog
      open={staffMember !== null}
      onOpenChange={(open) => onOpenChange(open)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this invitation?</DialogTitle>
          <DialogDescription>
            {staffMember
              ? `The pending account for ${staffMember.email} will be removed and its current invitation link will stop working.`
              : "The pending account will be removed."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Keep invitation
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
                Cancelling
              </>
            ) : (
              "Cancel invitation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
