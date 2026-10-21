import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export type StaffSelectOption = { value: string; label: string };

/** A labelled, form-bound select with the staff dialogs' large control sizing. */
export function StaffSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  id,
  label,
  placeholder,
  options,
}: {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  id: string;
  label: string;
  placeholder: string;
  options: readonly StaffSelectOption[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger
              id={id}
              size="lg"
              className="w-full"
              aria-invalid={fieldState.invalid}
            >
              <SelectValue placeholder={placeholder}>
                {(value) =>
                  options.find((option) => option.value === value)?.label
                }
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
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : null}
        </Field>
      )}
    />
  );
}
