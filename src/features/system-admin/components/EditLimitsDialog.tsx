import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Controller, useForm, type Control } from "react-hook-form";
import z from "zod";
import { DiscardChangesDialog } from "~/components/feedback/DiscardChangesDialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "~/components/ui/input-group";
import { Kbd } from "~/components/ui/kbd";
import { Spinner } from "~/components/ui/spinner";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { useUnsavedChangesClose } from "~/hooks/useUnsavedChangesClose";
import { CAPACITY_ALERT_PERCENT } from "../system-health.model";
import type { HealthLimitsInput, SystemHealthDashboard } from "../system-admin.types";

const BYTES_PER_GB = 1024 ** 3;

const slowLimit = z
  .string()
  .trim()
  .regex(/^\d+$/, "Enter whole milliseconds.")
  .refine((value) => Number(value) >= 100 && Number(value) <= 60_000, "Use 100 to 60,000 ms.");

const formSchema = z.object({
  database: slowLimit,
  authentication: slowLimit,
  storage: slowLimit,
  capacityGb: z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d+(\.\d+)?$/.test(value) && Number(value) > 0), "Enter a size in GB, or leave it empty."),
});

type FormValues = z.infer<typeof formSchema>;
type LimitName = keyof FormValues;

function LimitField({
  control,
  name,
  label,
  unit,
  description,
  placeholder,
  autoFocus,
}: {
  control: Control<FormValues>;
  name: LimitName;
  label: string;
  unit: string;
  description?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const id = `limit-${name}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <InputGroup size="lg">
            <InputGroupInput
              {...field}
              id={id}
              inputMode="decimal"
              autoComplete="off"
              autoFocus={autoFocus}
              placeholder={placeholder}
              className="font-mono tabular-nums"
              aria-invalid={fieldState.invalid}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>{unit}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
        </Field>
      )}
    />
  );
}

function LimitsForm({
  data,
  isPending,
  paused,
  onDirtyChange,
  onRequestClose,
  onClose,
  onConfirm,
}: {
  data: SystemHealthDashboard;
  isPending: boolean;
  /** True while the discard prompt is on top, so shortcuts stay quiet. */
  paused: boolean;
  onDirtyChange: (dirty: boolean) => void;
  /** Cancel: asks first when there are unsaved changes. */
  onRequestClose: () => void;
  /** After a successful save: closes without asking. */
  onClose: () => void;
  onConfirm: (input: HealthLimitsInput) => Promise<boolean>;
}) {
  const hotkeyLabel = useHotkeyLabel();
  const limit = (key: string) => String(data.services.find((service) => service.key === key)?.slowAfterMs ?? "");
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      database: limit("database"),
      authentication: limit("authentication"),
      storage: limit("storage"),
      capacityGb: data.capacity.capacityBytes ? String(Number((data.capacity.capacityBytes / BYTES_PER_GB).toFixed(2))) : "",
    },
  });
  const changeCount = Object.keys(form.formState.dirtyFields).length;
  const canSave = changeCount > 0 && !isPending;

  useEffect(() => {
    onDirtyChange(changeCount > 0);
    return () => onDirtyChange(false);
  }, [changeCount, onDirtyChange]);

  async function onSubmit(values: FormValues) {
    const succeeded = await onConfirm({
      database: Number(values.database),
      authentication: Number(values.authentication),
      storage: Number(values.storage),
      capacityGb: values.capacityGb === "" ? null : Number(values.capacityGb),
    });
    if (succeeded) onClose();
  }

  useHotkeys([{ hotkey: "Mod+Enter", callback: () => void form.handleSubmit(onSubmit)() }], {
    enabled: canSave && !paused,
    preventDefault: true,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Edit Limits</DialogTitle>
        <DialogDescription>
          A check slower than its limit counts as slow. Storage capacity sets the {CAPACITY_ALERT_PERCENT}% alert.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <LimitField control={form.control} name="database" label="Core database, slow after" unit="ms" autoFocus />
        <LimitField control={form.control} name="authentication" label="Authentication, slow after" unit="ms" />
        <LimitField control={form.control} name="storage" label="Document storage, slow after" unit="ms" />
        <LimitField
          control={form.control}
          name="capacityGb"
          label="Storage capacity"
          unit="GB"
          placeholder="Not set"
          description="Leave empty to show Not Configured."
        />
      </FieldGroup>

      <DialogFooter className="sm:items-center">
        <p className="text-sm text-muted-foreground sm:mr-auto">Each change is saved to the Audit Center.</p>
        <Button type="button" variant="outline" size="lg" disabled={isPending} onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={!canSave}>
          {isPending ? (
            <>
              <Spinner />
              Saving
            </>
          ) : (
            <>
              Save Limits
              {canSave ? (
                <Kbd aria-hidden="true" className="bg-primary-foreground/20 text-primary-foreground max-sm:hidden">
                  {hotkeyLabel("Mod+Enter")}
                </Kbd>
              ) : null}
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditLimitsDialog({
  open,
  data,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  data: SystemHealthDashboard;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: HealthLimitsInput) => Promise<boolean>;
}) {
  const { trackDirty, requestClose, closeNow, confirmingDiscard, setConfirmingDiscard } =
    useUnsavedChangesClose({ isPending, onClose: () => onOpenChange(false) });

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <LimitsForm
            data={data}
            isPending={isPending}
            paused={confirmingDiscard}
            onDirtyChange={trackDirty}
            onRequestClose={requestClose}
            onClose={closeNow}
            onConfirm={onConfirm}
          />
        ) : null}
        {/* Inside the dialog so the two stack as parent and child. */}
        <DiscardChangesDialog
          open={confirmingDiscard}
          subject="the limits editor"
          onKeepEditing={() => setConfirmingDiscard(false)}
          onDiscard={closeNow}
        />
      </DialogContent>
    </Dialog>
  );
}
