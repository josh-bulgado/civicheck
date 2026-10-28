import { useState } from "react";
import { QuietLink } from "~/components/quiet-link";
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
import { discardRequestUploadDraftFn } from "~/features/apply/apply.mutations";
import {
  useDiscardApplication,
  type ContinuableApplication,
} from "~/features/apply/hooks/useApplyDraft";
import { formatServiceCode } from "~/features/services/service-utils";

/**
 * An application the applicant started and left on this device. It sits under
 * the request they are tracking, never over it: tracking is what they came for.
 * Nothing when there is no application to continue. The dashboard reads the
 * draft itself, so it can hold a skeleton until the answer is known.
 *
 * A draft nobody wants anymore can be thrown away from here, without opening
 * the wizard to do it.
 */
export function ContinueApplicationCard({
  application,
}: {
  application: ContinuableApplication | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const discardApplication = useDiscardApplication();

  if (!application) return null;

  // A draft saved before names were remembered falls back to its code.
  const name = application.serviceName ?? formatServiceCode(application.routeCode);

  function discard() {
    const uploadDraftId = discardApplication(application!.routeCode);
    if (uploadDraftId) {
      discardRequestUploadDraftFn({ data: { uploadDraftId } }).catch(() => {});
    }
    setConfirming(false);
  }

  return (
    <div className="relative">
      <QuietLink
        to="/apply/$serviceCode/case"
        params={{ serviceCode: application.routeCode }}
        className="civic-press flex items-center gap-4 rounded-4xl bg-card px-5 py-3.5 shadow-portal-card hover:bg-primary-tint md:gap-5 md:px-7 md:py-3.5"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-snug font-semibold text-primary">
            Continue your application
          </span>
          <span className="block truncate text-[18px] leading-snug font-semibold text-foreground">
            {name}
          </span>
        </span>
        {/* Room for the discard button, which sits over it: a button can't live
            inside the link. */}
        <span className="size-10 shrink-0" aria-hidden="true" />
      </QuietLink>

      <button
        type="button"
        aria-label={`Discard your ${name} application`}
        onClick={() => setConfirming(true)}
        className="civic-press absolute top-1/2 right-5 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-portal-danger-soft hover:text-destructive md:right-7"
      >
        <Trash2 className="size-4.5" aria-hidden="true" />
      </button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Your answers and uploaded files for {name} will be deleted. Nothing
              has been sent to the CCRO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discard}>
              Discard draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
