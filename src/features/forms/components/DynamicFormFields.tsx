import { Controller, type Control } from "react-hook-form";
import { Phone } from "lucide-react";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { toDateKey } from "~/lib/date";
import type {
  FormSectionDefinition,
  FormStep,
  FormTemplateDefinition,
} from "../form-template.types";

export type DynamicFieldValues = Record<string, string>;

function conditionMatches(
  section: FormSectionDefinition,
  values: DynamicFieldValues,
) {
  return section.fields.filter((field) => {
    if (!field.visibleWhen) return true;
    const current = values[field.visibleWhen.field] ?? "";
    return field.visibleWhen.operator === "equals"
      ? current === field.visibleWhen.value
      : current !== field.visibleWhen.value;
  });
}

export function DynamicFormFields({
  definition,
  step,
  control,
  values,
  onDateChange,
}: {
  definition: FormTemplateDefinition;
  step: FormStep;
  control: Control<any>;
  values: DynamicFieldValues;
  onDateChange?: (fieldKey: string, value: string) => void;
}) {
  const sections = definition.sections.filter((section) => section.step === step);

  return sections.map((section) => {
    const fields = conditionMatches(section, values).filter(
      (field) => field.type !== "person_group",
    );
    if (!fields.length) return null;

    return (
      <section key={section.key} className="flex flex-col gap-3">
        {sections.length > 1 ? (
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
            {section.description ? (
              <p className="text-xs text-muted-foreground">{section.description}</p>
            ) : null}
          </div>
        ) : null}

        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((definitionField) => (
            <Controller
              key={definitionField.key}
              control={control}
              name={definitionField.key}
              rules={{
                required: definitionField.required
                  ? `${definitionField.label} is required`
                  : false,
                validate: (value) => {
                  if (!value) return true;
                  if (definitionField.type === "phone" && !/^9\d{9}$/.test(value)) {
                    return "Enter a valid 10-digit mobile number, e.g. 9171234567";
                  }
                  return true;
                },
                maxLength: {
                  value: definitionField.type === "textarea" ? 2_000 : 240,
                  message: `${definitionField.label} is too long`,
                },
              }}
              render={({ field, fieldState }) => {
                const common = (
                  <>
                    {definitionField.helpText ? (
                      <FieldDescription>{definitionField.helpText}</FieldDescription>
                    ) : null}
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </>
                );

                return (
                  <Field
                    data-invalid={fieldState.invalid}
                    className={
                      definitionField.type === "textarea" ? "sm:col-span-2" : undefined
                    }
                  >
                    <FieldLabel htmlFor={`dynamic-${definitionField.key}`}>
                      {definitionField.label}
                      {!definitionField.required ? " (optional)" : ""}
                    </FieldLabel>

                    {definitionField.type === "textarea" ? (
                      <Textarea
                        {...field}
                        id={`dynamic-${definitionField.key}`}
                        rows={3}
                        maxLength={2_000}
                        placeholder={definitionField.placeholder}
                        aria-invalid={fieldState.invalid}
                      />
                    ) : definitionField.type === "date" ? (
                      <DatePicker
                        id={`dynamic-${definitionField.key}`}
                        value={field.value ?? ""}
                        onValueChange={(value) => {
                          field.onChange(value);
                          onDateChange?.(definitionField.key, value);
                        }}
                        onBlur={field.onBlur}
                        max={
                          definitionField.dateDirection === "past" ? toDateKey() : undefined
                        }
                        min={
                          definitionField.dateDirection === "future" ? toDateKey() : undefined
                        }
                        placeholder={
                          definitionField.placeholder ??
                          `Select ${definitionField.label.toLowerCase()}`
                        }
                        invalid={fieldState.invalid}
                      />
                    ) : definitionField.type === "select" ? (
                      <Select
                        items={definitionField.options ?? []}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id={`dynamic-${definitionField.key}`}
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Select one" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {(definitionField.options ?? []).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : definitionField.type === "phone" ? (
                      <InputGroup>
                        <InputGroupAddon>
                          <Phone aria-hidden="true" />
                          <InputGroupText>+63</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          id={`dynamic-${definitionField.key}`}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder={definitionField.placeholder}
                          maxLength={10}
                          aria-invalid={fieldState.invalid}
                        />
                      </InputGroup>
                    ) : (
                      <Input
                        {...field}
                        id={`dynamic-${definitionField.key}`}
                        autoComplete="off"
                        placeholder={definitionField.placeholder}
                        maxLength={240}
                        aria-invalid={fieldState.invalid}
                      />
                    )}
                    {common}
                  </Field>
                );
              }}
            />
          ))}
        </FieldGroup>
      </section>
    );
  });
}
