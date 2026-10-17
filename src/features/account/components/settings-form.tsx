import { CircleAlert } from "lucide-react";
import type * as React from "react";
import { Button } from "~/components/ui/button";
import { DialogFooter } from "~/components/ui/dialog";
import { Field, FieldLabel } from "~/components/ui/field";
import { RequiredMark } from "~/components/ui/required-mark";
import { Spinner } from "~/components/ui/spinner";
import { pillButton } from "~/components/portal/styles";
import { cn } from "~/lib/utils";

/**
 * The look of a field in the settings dialog. The dialog portals outside the
 * citizen shell, so ink and line colours can't come from the shell's tokens.
 * They are set once as `--settings-*` variables on the dialog's content (see
 * SettingsDialog) and read from here.
 *
 * Controls are 48px and 16px below `md`, where anything smaller makes iOS zoom
 * the page on focus, and 44px and 15px from `md` up. Both clear the 44px touch
 * minimum.
 */

/** Label above a field: 14px semibold, the asterisk sits close to the text. */
export const SETTINGS_LABEL_CLASS =
  "gap-1 text-sm leading-5 font-semibold text-foreground";

/** Single-line controls: a 1px line dark enough to find the field by. */
export const SETTINGS_CONTROL_CLASS =
  "h-12 rounded-xl border-(--settings-line) bg-white px-3.5 text-base shadow-none placeholder:text-(--settings-placeholder) md:h-11 md:text-[15px]";

/** A control made of an input and a trailing button (the password fields). */
export const SETTINGS_GROUP_CLASS =
  "h-12 rounded-xl border-(--settings-line) bg-white shadow-none md:h-11 *:data-[slot=input-group-control]:h-full *:data-[slot=input-group-control]:px-3.5 *:data-[slot=input-group-control]:text-base md:*:data-[slot=input-group-control]:text-[15px]";

/** The date picker's trigger, to match the other controls. */
export const SETTINGS_PICKER_CLASS =
  "h-12 rounded-xl border-(--settings-line) bg-white px-3.5 text-base shadow-none hover:bg-white md:h-11 md:text-[15px]";

/**
 * One labelled setting: the label on top, then the control, then an optional
 * hint, then the error. Stacking them keeps the eye on one line and lets the
 * same field work at every width.
 */
export function SettingsRow({
  label,
  htmlFor,
  required = false,
  hint,
  invalid = false,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: React.ReactNode;
  invalid?: boolean;
  error?: { message?: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Field data-invalid={invalid} className={cn("min-w-0 gap-1.5", className)}>
      <FieldLabel htmlFor={htmlFor} className={SETTINGS_LABEL_CLASS}>
        {label}
        {required && <RequiredMark />}
      </FieldLabel>
      {children}
      {hint && (
        <div className="text-[13px] leading-[18px] text-body-2">{hint}</div>
      )}
      {invalid && error?.message && (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-[13px] leading-[18px] text-destructive"
        >
          <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}
    </Field>
  );
}

/**
 * Cancel and Save for a settings form, under a hairline. While there are edits
 * the footer says so, in words as well as colour (from `md`; on a phone the
 * enabled Save button is the cue). Save stays pale until something has been
 * changed, and keeps its colour while saving so the spinner does not read as a
 * disabled button.
 */
export function SettingsFormFooter({
  onCancel,
  canSave,
  pending,
  submitLabel = "Save changes",
  pendingLabel = "Saving…",
}: {
  onCancel: () => void;
  canSave: boolean;
  pending: boolean;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  return (
    <DialogFooter className="shrink-0 flex-row items-center gap-2 border-t border-border-lighter px-5 pt-4 pb-5 md:gap-3 md:px-8">
      <p
        role="status"
        className="hidden flex-1 items-center gap-2 text-sm text-body-2 md:flex"
      >
        {canSave && !pending ? (
          <>
            <span
              className="size-2 rounded-full bg-warning"
              aria-hidden="true"
            />
            Unsaved changes
          </>
        ) : null}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className={cn(
          pillButton.outline,
          "h-12 flex-1 px-5 text-base md:h-11 md:flex-none md:text-[15px]",
        )}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={!canSave || pending}
        className={cn(
          pillButton.primary,
          "h-12 flex-2 px-6 text-base disabled:opacity-100 md:h-11 md:flex-none md:text-[15px]",
          pending
            ? "disabled:bg-primary disabled:text-primary-foreground"
            : "disabled:bg-(--settings-disabled-bg) disabled:text-(--settings-disabled-ink)",
        )}
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <Spinner className="size-4" />
            {pendingLabel}
          </span>
        ) : (
          submitLabel
        )}
      </Button>
    </DialogFooter>
  );
}
