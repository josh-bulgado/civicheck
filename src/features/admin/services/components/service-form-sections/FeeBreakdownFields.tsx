import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { PhilippinePeso, Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { feeComponentsIssue } from "~/features/services/fee-components";
import {
  toFeeComponentPayload,
  type ServiceFormValues,
} from "../service-form.config";

/**
 * The itemized charges behind the total fee. Included rows must add up to the
 * total; the rest are shown to applicants as "also payable" and never counted.
 */
export function FeeBreakdownFields() {
  const form = useFormContext<ServiceFormValues>();
  const rows = useFieldArray({ control: form.control, name: "fee_components" });
  const [fee, watched] = useWatch({
    control: form.control,
    name: ["fee", "fee_components"],
  });

  const issue = feeComponentsIssue(
    toFeeComponentPayload(watched ?? []),
    Number(fee) || 0,
  );
  const rowsError = form.formState.errors.fee_components;
  const submitIssue = rowsError?.root?.message ?? rowsError?.message;

  return (
    <section
      className="flex flex-col gap-3 border-t border-border pt-5"
      aria-labelledby="fee-breakdown-heading"
    >
      <div>
        <h3
          id="fee-breakdown-heading"
          className="text-sm font-medium text-foreground"
        >
          Fee Breakdown{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          Itemize what the total is made of so applicants see it on the review
          page. Rows marked &ldquo;In total&rdquo; must add up to the total fee.
          Unmarked rows are shown as also payable and are not added.
        </p>
      </div>

      {rows.fields.map((row, index) => (
        <div
          key={row.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto_auto]"
        >
          <Controller
            control={form.control}
            name={`fee_components.${index}.label`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Input
                  {...field}
                  placeholder="Solemnization fee…"
                  aria-label={`Charge ${index + 1} description`}
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name={`fee_components.${index}.amount`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="col-start-1 sm:col-start-auto">
                <InputGroup>
                  <InputGroupAddon>
                    <PhilippinePeso size={16} />
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00…"
                    aria-label={`Charge ${index + 1} amount`}
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                </InputGroup>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name={`fee_components.${index}.included`}
            render={({ field }) => (
              <Field orientation="horizontal" className="h-9 items-center">
                <Checkbox
                  id={`fee-component-${row.id}-included`}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <FieldLabel
                  htmlFor={`fee-component-${row.id}-included`}
                  className="text-sm whitespace-nowrap"
                >
                  In total
                </FieldLabel>
              </Field>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => rows.remove(index)}
            aria-label={`Remove charge ${index + 1}`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            rows.append({ label: "", amount: "", included: true })
          }
        >
          <Plus aria-hidden="true" data-icon="inline-start" />
          Add Charge
        </Button>
        {issue || submitIssue ? (
          <p role="alert" className="text-sm text-destructive">
            {issue ?? submitIssue}
          </p>
        ) : null}
      </div>
    </section>
  );
}
