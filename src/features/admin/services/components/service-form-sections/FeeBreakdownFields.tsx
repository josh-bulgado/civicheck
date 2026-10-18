import { useEffect, useState } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Field, FieldDescription, FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  describeAlsoPayable,
  feeComponentsIssue,
  feeTotalStatus,
  feeUnitLabel,
  splitFeeComponents,
  type FeeUnit,
} from "~/features/services/fee-components";
import { cn } from "~/lib/utils";
import {
  toFeeComponentPayload,
  type ServiceFormValues,
} from "../service-form.config";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const FEE_UNIT_OPTIONS: ("" | FeeUnit)[] = ["", "page", "copy", "document"];

/**
 * The itemized charges behind the total fee. Included rows must add up to the
 * total; the rest are shown to applicants as "also payable" and never counted.
 * Open when the service already has line items; closed when there is nothing
 * to show yet.
 */
export function FeeBreakdownFields() {
  const form = useFormContext<ServiceFormValues>();
  const rows = useFieldArray({ control: form.control, name: "fee_components" });
  const [fee, watched, feePerCopy] = useWatch({
    control: form.control,
    name: ["fee", "fee_components", "fee_per_copy"],
  });
  const [open, setOpen] = useState(rows.fields.length > 0);

  const components = toFeeComponentPayload(watched ?? []);
  const feeAmount = Number(fee) || 0;
  const { state, includedTotal, difference } = feeTotalStatus(
    components,
    feeAmount,
  );
  const issue = feeComponentsIssue(components, feeAmount);
  const named = components.filter((component) => component.label !== "");
  const { included: receiptIncluded, alsoPayable: receiptAlsoPayable } =
    splitFeeComponents(named);
  const rowsError = form.formState.errors.fee_components;
  const submitIssue = rowsError?.root?.message ?? rowsError?.message;
  const hasSubmitError = Boolean(rowsError);

  // A rejected save must never leave its reason behind a closed panel.
  useEffect(() => {
    if (hasSubmitError) setOpen(true);
  }, [hasSubmitError]);

  const summary =
    components.length === 0
      ? "No itemized charges"
      : `${components.length} line ${components.length === 1 ? "item" : "items"} · ${pesoFormatter.format(includedTotal)} in total`;

  return (
    <section
      className="flex flex-col gap-3 border-t border-border pt-5"
      aria-labelledby="fee-breakdown-heading"
    >
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="flex flex-col gap-3"
      >
        <h3
          id="fee-breakdown-heading"
          className="text-sm font-medium text-foreground"
        >
          <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>
                Fee Breakdown{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </span>
              <span
                className={cn(
                  "text-xs font-normal",
                  issue ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {issue ? "Doesn’t match the total fee" : summary}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180"
            />
          </CollapsibleTrigger>
        </h3>

        <CollapsibleContent className="flex flex-col gap-3">
          <FieldDescription>
            Rows marked &ldquo;In total&rdquo; must add up to the total fee. Other rows show as also payable.
          </FieldDescription>

          {rows.fields.length > 0 ? (
            <div className="rounded-lg border border-border">
              <Table className="min-w-[56rem]">
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-48">Charge</TableHead>
                    <TableHead className="w-32 text-right">
                      Amount (PHP)
                    </TableHead>
                    <TableHead className="w-36">Charged</TableHead>
                    <TableHead className="w-20 text-center">In total</TableHead>
                    <TableHead className="min-w-56">When it applies</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Remove</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.fields.map((row, index) => {
                    const isIncluded = watched?.[index]?.included ?? true;
                    return (
                      <TableRow key={row.id} className="hover:bg-transparent">
                        <TableCell className="align-top whitespace-normal">
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
                        </TableCell>
                        <TableCell className="align-top whitespace-normal">
                          <Controller
                            control={form.control}
                            name={`fee_components.${index}.amount`}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <Input
                                  {...field}
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="0.00…"
                                  className="text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  aria-label={`Charge ${index + 1} amount in pesos`}
                                  aria-invalid={fieldState.invalid}
                                  autoComplete="off"
                                />
                                {fieldState.invalid ? (
                                  <FieldError errors={[fieldState.error]} />
                                ) : null}
                              </Field>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Controller
                            control={form.control}
                            name={`fee_components.${index}.unit`}
                            render={({ field }) => (
                              <Select
                                name={field.name}
                                value={field.value}
                                onValueChange={(next) =>
                                  field.onChange(next ?? "")
                                }
                                disabled={isIncluded}
                              >
                                <SelectTrigger
                                  className="w-full disabled:bg-muted/50"
                                  aria-label={`How charge ${index + 1} is charged`}
                                >
                                  <SelectValue>
                                    {(value) =>
                                      feeUnitLabel(
                                        (value as "" | FeeUnit) || undefined,
                                      )
                                    }
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {FEE_UNIT_OPTIONS.map((unit) => (
                                      <SelectItem key={unit} value={unit}>
                                        {feeUnitLabel(unit || undefined)}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Controller
                            control={form.control}
                            name={`fee_components.${index}.included`}
                            render={({ field }) => (
                              <div className="flex h-9 items-center justify-center">
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    const next = checked === true;
                                    field.onChange(next);
                                    if (next) {
                                      form.setValue(
                                        `fee_components.${index}.unit`,
                                        "",
                                        { shouldDirty: true },
                                      );
                                      form.setValue(
                                        `fee_components.${index}.note`,
                                        "",
                                        { shouldDirty: true },
                                      );
                                    }
                                  }}
                                  aria-label={`Charge ${index + 1} counts toward the total fee`}
                                />
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top whitespace-normal">
                          <Controller
                            control={form.control}
                            name={`fee_components.${index}.note`}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <Input
                                  {...field}
                                  maxLength={120}
                                  disabled={isIncluded}
                                  className="disabled:bg-muted/50"
                                  placeholder="Add when it applies…"
                                  aria-label={`When charge ${index + 1} applies`}
                                  aria-invalid={fieldState.invalid}
                                  autoComplete="off"
                                />
                                {fieldState.invalid ? (
                                  <FieldError errors={[fieldState.error]} />
                                ) : null}
                              </Field>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="relative size-9 text-muted-foreground after:absolute after:-inset-1 hover:text-destructive"
                            onClick={() => rows.remove(index)}
                            aria-label={`Remove charge ${index + 1}`}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="font-medium">Included total</TableCell>
                    <TableCell
                      className={cn(
                        "pr-[1.125rem] text-right font-semibold tabular-nums",
                        issue && "text-destructive",
                      )}
                    >
                      {pesoFormatter.format(includedTotal)}
                    </TableCell>
                    <TableCell colSpan={4}>
                      {state === "match" ? (
                        <Badge variant="success">Matches</Badge>
                      ) : state === "short" ? (
                        <Badge variant="destructive">
                          {pesoFormatter.format(difference)} short
                        </Badge>
                      ) : state === "over" ? (
                        <Badge variant="destructive">
                          {pesoFormatter.format(Math.abs(difference))} over
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : null}

          {issue || submitIssue ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-tone-danger-soft px-3 py-2">
              <p role="alert" className="min-w-0 flex-1 text-sm text-destructive">
                {issue ?? submitIssue}
              </p>
              {state === "short" || state === "over" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-8"
                  onClick={() =>
                    form.setValue("fee", String(includedTotal), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  Set Total Fee to {pesoFormatter.format(includedTotal)}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 text-primary"
              onClick={() =>
                rows.append({
                  label: "",
                  amount: "",
                  included: true,
                  unit: "",
                  note: "",
                })
              }
            >
              <Plus aria-hidden="true" data-icon="inline-start" />
              Add Charge
            </Button>
          </div>

          {named.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                What Applicants See
              </h4>
              <div className="flex items-baseline justify-between gap-3 text-sm font-medium">
                <span>
                  {feePerCopy ? "Fee per copy" : "Total fee at the cashier"}
                </span>
                <span className="tabular-nums">
                  {pesoFormatter.format(feeAmount)}
                </span>
              </div>
              {receiptIncluded.length > 0 ? (
                <ul className="flex flex-col gap-1 border-t border-border pt-2 text-sm">
                  {receiptIncluded.map((component, index) => (
                    <li
                      key={index}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="min-w-0 break-words">
                        {component.label}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {pesoFormatter.format(component.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {receiptAlsoPayable.length > 0 ? (
                <div className="flex flex-col gap-1 border-t border-border pt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Also payable, depending on your request
                  </p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {receiptAlsoPayable.map((component, index) => (
                      <li
                        key={index}
                        className="flex flex-wrap items-baseline justify-between gap-x-3"
                      >
                        <span className="min-w-0 break-words">
                          {component.label}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {describeAlsoPayable(component)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
