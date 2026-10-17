import type * as React from "react";
import { Button } from "~/components/ui/button";
import { DialogFooter } from "~/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { RequiredMark } from "~/components/ui/required-mark";
import { Spinner } from "~/components/ui/spinner";
import { pillButton } from "~/components/portal/styles";
import { cn } from "~/lib/utils";

/**
 * The look of a field in the settings dialog. The dialog portals outside the
 * citizen shell, so ink and line colours are spelled out rather than read from
 * the shell's tokens.
 *
 * Controls are 13px on desktop and 16px below `md`, where anything smaller makes
 * iOS zoom the page on focus.
 */

/** Label beside a field: 13px medium, the asterisk sits close to the text. */
export const SETTINGS_LABEL_CLASS =
  "gap-1 text-[13px] leading-5 font-medium text-foreground";

/** Single-line controls: 40px tall, 12px corners, a 1px line on white. */
export const SETTINGS_CONTROL_CLASS =
  "h-10 rounded-xl border-border bg-card px-3.5 text-base shadow-none placeholder:text-disabled md:text-[13px]";

/** A control made of an input and a trailing button (the password fields). */
export const SETTINGS_GROUP_CLASS =
  "h-10 rounded-xl border-border bg-card shadow-none *:data-[slot=input-group-control]:h-full *:data-[slot=input-group-control]:px-3.5 *:data-[slot=input-group-control]:text-base md:*:data-[slot=input-group-control]:text-[13px]";

/** The date picker's trigger, to match the other controls. */
export const SETTINGS_PICKER_CLASS =
  "h-10 rounded-xl border-border bg-card px-3.5 text-[13px] shadow-none hover:bg-card";

/**
 * One labelled setting: the label (and an optional hint) on the left, the
 * control on the right, a hairline under every row but the last. Below `sm` the
 * control drops under its label. The label stays level with the control's first
 * line, so an error message growing the row does not drag it down.
 */
export function SettingsRow({
  label,
  htmlFor,
  required = false,
  hint,
  invalid = false,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  invalid?: boolean;
  error?: { message?: string };
  children: React.ReactNode;
}) {
  return (
    <Field
      data-invalid={invalid}
      className="grid gap-2 border-b border-border-lighter py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_16.5rem] sm:gap-x-4"
    >
      <div className="flex min-h-10 flex-col justify-center">
        <FieldLabel htmlFor={htmlFor} className={SETTINGS_LABEL_CLASS}>
          {label}
          {required && <RequiredMark />}
        </FieldLabel>
        {hint && <p className="text-xs leading-4 text-body-2">{hint}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        {children}
        {invalid && error && (
          <FieldError errors={[error]} className="text-xs" />
        )}
      </div>
    </Field>
  );
}

/**
 * Cancel and Save for a settings form, under a hairline. Save stays pale until
 * something has been changed, and keeps its colour while saving so the
 * spinner does not read as a disabled button.
 */
export function SettingsFormFooter({
  onCancel,
  canSave,
  pending,
}: {
  onCancel: () => void;
  canSave: boolean;
  pending: boolean;
}) {
  return (
    <DialogFooter className="mt-3 shrink-0 flex-row justify-end gap-2 border-t border-border-lighter pt-4 pb-5">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className={cn(pillButton.outline, "h-10 px-5 text-[13px]")}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={!canSave || pending}
        className={cn(
          pillButton.primary,
          "h-10 px-5 text-[13px] disabled:opacity-100",
          pending
            ? "disabled:bg-primary disabled:text-primary-foreground"
            : "disabled:bg-[#e4e9f1] disabled:text-disabled",
        )}
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <Spinner className="size-4" />
            Saving...
          </span>
        ) : (
          "Save changes"
        )}
      </Button>
    </DialogFooter>
  );
}
