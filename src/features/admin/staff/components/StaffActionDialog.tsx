import type { ReactNode } from "react";
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

export type StaffActionDialogCopy = {
  title: string;
  description: (staffMember: StaffMember | null) => ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  pendingLabel: string;
};

export function StaffActionDialog({
  staffMember,
  copy,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  staffMember: StaffMember | null;
  copy: StaffActionDialogCopy;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={staffMember !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description(staffMember)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {copy.cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <Spinner />
                {copy.pendingLabel}
              </>
            ) : (
              copy.confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
