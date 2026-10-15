import { CircleAlert } from "lucide-react";
import { FieldError } from "~/components/ui/field";

/**
 * The look of a form field inside the application wizard. Every step builds its
 * inputs from these so a label, a control and an error read the same on the
 * case, details and review steps instead of each step carrying its own sizes.
 */

/** Label above a field, and the legend above a group of choice tiles. */
export const WIZARD_LABEL_CLASS = "text-[15px] font-semibold text-portal-ink-2";

// An invalid control gets a tinted face and a solid 1px ring on top of the red
// border, so the error is visible without relying on the border hue alone.
const INVALID_CONTROL_CLASS =
  "aria-invalid:bg-destructive/10 aria-invalid:ring-1 aria-invalid:ring-destructive";

/**
 * Single-line controls: 56px tall, 14px corners, a 1px #d7dee9 line on white,
 * 17px type. The type size is also what keeps iOS Safari from zooming the page
 * when a field gains focus (it does so under 16px), and 56px is well past the
 * 44px touch target, so one size serves every screen. `data-[size=default]`
 * is there because a select's own height is set under that selector, which a
 * plain `h-14` would lose to.
 */
export const WIZARD_CONTROL_CLASS = `h-14 rounded-[14px] border-[#d7dee9] bg-white px-4.5 text-[17px] shadow-none placeholder:text-[#8a97a8] data-placeholder:text-[#8a97a8] data-[size=default]:h-14 md:text-[17px] ${INVALID_CONTROL_CLASS}`;

export const WIZARD_TEXTAREA_CLASS = `rounded-[14px] border-[#d7dee9] bg-white px-4.5 py-3.5 text-[17px] shadow-none placeholder:text-[#8a97a8] md:text-[17px] ${INVALID_CONTROL_CLASS}`;

/** A control made of an addon and an input (the mobile number): same face as the single-line ones. */
export const WIZARD_GROUP_CLASS =
  "h-14 rounded-[14px] border-[#d7dee9] bg-white shadow-none *:data-[slot=input-group-control]:text-[17px] md:*:data-[slot=input-group-control]:text-[17px]";

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
