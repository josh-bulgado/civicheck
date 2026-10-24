import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Controller, useForm } from "react-hook-form";
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
import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kbd";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { useUnsavedChangesClose } from "~/hooks/useUnsavedChangesClose";
import type { MaintenanceInput, ServiceHealth } from "../system-admin.types";

const formSchema = z
  .object({
    component: z.string().min(1, "Choose a service."),
    title: z.string().trim().min(1, "Enter a title.").max(120, "Use 120 characters or fewer."),
    startsAt: z.string().min(1, "Choose when it starts."),
    endsAt: z.string().min(1, "Choose when it ends."),
    note: z.string().trim().max(500, "Use 500 characters or fewer."),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "The window must end after it starts.",
    path: ["endsAt"],
  });

type FormValues = z.infer<typeof formSchema>;

/** A value for an `<input type="datetime-local">`, in the browser's own time. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Tomorrow, on the hour, for half an hour: a sensible default for planned work. */
function defaultWindow() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setMinutes(0, 0, 0);
  return { startsAt: toLocalInput(start), endsAt: toLocalInput(new Date(start.getTime() + 30 * 60_000)) };
}

function MaintenanceForm({
  services,
  defaultComponent,
  isPending,
  paused,
  onDirtyChange,
  onRequestClose,
  onClose,
  onConfirm,
}: {
  services: ServiceHealth[];
  defaultComponent: string;
  isPending: boolean;
  /** True while the discard prompt is on top, so shortcuts stay quiet. */
  paused: boolean;
  onDirtyChange: (dirty: boolean) => void;
  /** Cancel: asks first when there are unsaved changes. */
  onRequestClose: () => void;
  /** After a successful save: closes without asking. */
  onClose: () => void;
  onConfirm: (input: MaintenanceInput) => Promise<boolean>;
}) {
  const hotkeyLabel = useHotkeyLabel();
  const options = [
    ...services.map((service) => ({ value: service.key, label: service.name })),
    { value: "all", label: "All services" },
  ];
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: { component: defaultComponent, title: "", note: "", ...defaultWindow() },
  });

  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange(isDirty);
    return () => onDirtyChange(false);
  }, [isDirty, onDirtyChange]);

  async function onSubmit(values: FormValues) {
    const succeeded = await onConfirm({
      component: values.component as MaintenanceInput["component"],
      title: values.title,
      note: values.note,
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
    });
    if (succeeded) onClose();
  }

  useHotkeys([{ hotkey: "Mod+Enter", callback: () => void form.handleSubmit(onSubmit)() }], {
    enabled: !isPending && !paused,
    preventDefault: true,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Record Maintenance</DialogTitle>
        <DialogDescription>
          Planned work shows in the Planned tab. While the window is open, checks that run slow or fail are not raised as incidents.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Controller
          control={form.control}
          name="component"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="maintenance-component">Component</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="maintenance-component" size="lg" className="w-full">
                  <SelectValue placeholder="Choose a service">
                    {(value) => options.find((option) => option.value === value)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent variant="roomy">
                  <SelectGroup>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="maintenance-title">Title</FieldLabel>
              <Input
                {...field}
                id="maintenance-title"
                fieldSize="lg"
                autoComplete="off"
                placeholder="Storage provider upgrade"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="startsAt"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="maintenance-starts">Starts</FieldLabel>
                <Input {...field} id="maintenance-starts" type="datetime-local" fieldSize="lg" aria-invalid={fieldState.invalid} />
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="endsAt"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="maintenance-ends">Ends</FieldLabel>
                <Input {...field} id="maintenance-ends" type="datetime-local" fieldSize="lg" aria-invalid={fieldState.invalid} />
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="note"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="maintenance-note">Note</FieldLabel>
              <Textarea {...field} id="maintenance-note" placeholder="The provider will restart the storage service." aria-invalid={fieldState.invalid} />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>A short summary only. Do not include citizen information.</FieldDescription>
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter className="sm:items-center">
        <p className="text-sm text-muted-foreground sm:mr-auto">Saved to the Audit Center.</p>
        <Button type="button" variant="outline" size="lg" disabled={isPending} onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner />
              Saving
            </>
          ) : (
            <>
              Record Maintenance
              <Kbd aria-hidden="true" className="bg-primary-foreground/20 text-primary-foreground max-sm:hidden">
                {hotkeyLabel("Mod+Enter")}
              </Kbd>
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RecordMaintenanceDialog({
  open,
  services,
  defaultComponent,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  services: ServiceHealth[];
  /** The service the dialog opens on: the one with an incident, if any. */
  defaultComponent: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: MaintenanceInput) => Promise<boolean>;
}) {
  const { trackDirty, requestClose, closeNow, confirmingDiscard, setConfirmingDiscard } =
    useUnsavedChangesClose({ isPending, onClose: () => onOpenChange(false) });

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <MaintenanceForm
            services={services}
            defaultComponent={defaultComponent}
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
          subject="the maintenance form"
          onKeepEditing={() => setConfirmingDiscard(false)}
          onDiscard={closeNow}
        />
      </DialogContent>
    </Dialog>
  );
}
