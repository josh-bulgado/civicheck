import { CircleAlert } from "lucide-react";
import { FieldError } from "~/components/ui/field";

/**
 * The look of a form field inside the application wizard. Every step builds its
 * inputs from these so a label, a control and an error read the same on the
 * case, details and review steps instead of each step carrying its own sizes.
 */

/** Label above a field, and the legend above a group of choice tiles. */
export const WIZARD_LABEL_CLASS = "text-[15px] font-semibold";

// An invalid control gets a tinted face and a solid 1px ring on top of the red
// border, so the error is visible without relying on the border hue alone.
const INVALID_CONTROL_CLASS =
  "aria-invalid:bg-destructive/10 aria-invalid:ring-1 aria-invalid:ring-destructive";

/**
 * Single-line controls. On a phone they are 44px tall with 16px type: iOS
 * Safari zooms the whole page when a field under 16px gains focus, and 44px is
 * the touch-target size. From `md` up they are 38px tall with 15px type to
 * match the labels above them.
 */
export const WIZARD_CONTROL_CLASS = `h-11 text-base md:h-9.5 md:text-[15px] ${INVALID_CONTROL_CLASS}`;

export const WIZARD_TEXTAREA_CLASS = `text-base md:text-[15px] ${INVALID_CONTROL_CLASS}`;

/** Error line under a field: icon plus message, 15px semibold in the error ink. */
export function WizardFieldError({
  error,
}: {
  error?: { message?: string } | undefined;
}) {
  if (!error?.message) return null;
  return (
    <FieldError
      errors={[error]}
      className="flex items-center gap-1.5 text-[15px] font-semibold"
    >
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {error.message}
    </FieldError>
  );
}
