import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";

/**
 * Removes the registration window rule after a confirmation. The rule's message
 * and settings are lost, so the dialog asks first instead of offering Undo.
 */
export function RemoveWindowRuleButton({ onRemove }: { onRemove: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 rounded-[10px] px-3.5 text-[13.5px] text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden="true" data-icon="inline-start" />
        Remove Rule
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this window rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Applicants will no longer be prompted to switch tracks based on
              their event date. The message and settings you wrote for this rule
              will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Rule</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onRemove}>
              Remove Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
