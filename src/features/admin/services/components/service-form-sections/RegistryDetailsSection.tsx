import { useId } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FileText, PhilippinePeso } from "lucide-react";
import type { Department } from "~/features/admin/departments.queries";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Field,
  FieldContent,
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
} from "~/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import type { Service } from "../../services.types";
import { FeeBreakdownFields } from "./FeeBreakdownFields";
import {
  SERVICE_CLASSIFICATIONS,
  UNASSIGNED_DEPARTMENT_VALUE,
  type ServiceFormValues,
} from "../service-form.config";

interface RegistryDetailsSectionProps {
  services: Service[];
  departments: Department[];
  isEdit: boolean;
  presetCode: string;
  onPresetChange: (code: string | null) => void;
  embedded?: boolean;
}

function SettingGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <h3
        id={headingId}
        className="pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {title}
      </h3>
      <div className="flex flex-col divide-y divide-border border-t">
        {children}
      </div>
    </section>
  );
}

interface SettingRowProps {
  label: React.ReactNode;
  htmlFor: string;
  help?: React.ReactNode;
  error?: { message?: string };
  children: React.ReactNode;
}

/** Label and help on the left, control and error on the right; stacked below `sm`. */
function SettingRow({
  label,
  htmlFor,
  help,
  error,
  children,
}: SettingRowProps) {
  return (
    <Field
      data-invalid={Boolean(error)}
      className="grid gap-3 py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start sm:gap-x-8"
    >
      <FieldContent className="min-w-0">
        <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
        {help ? <FieldDescription>{help}</FieldDescription> : null}
      </FieldContent>
      <div className="flex min-w-0 flex-col gap-2">
        {children}
        {error ? <FieldError errors={[error]} /> : null}
      </div>
    </Field>
  );
}

export function RegistryDetailsSection({
  services,
  departments,
  isEdit,
  presetCode,
  onPresetChange,
  embedded = false,
}: RegistryDetailsSectionProps) {
  const form = useFormContext<ServiceFormValues>();
  const feePerCopy = useWatch({ control: form.control, name: "fee_per_copy" });

  return (
    <Card
      id={embedded ? undefined : "registry-details"}
      variant={embedded ? "embedded" : "default"}
      className={embedded ? undefined : "scroll-mt-6"}
    >
      {!embedded ? (
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <FileText aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle>
                <h2 className="text-pretty">Registry &amp; Fees</h2>
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      ) : null}
      <CardContent>
        <FieldGroup className="gap-8">
          <SettingGroup title="Service">
            {!isEdit ? (
              <SettingRow
                label={
                  <>
                    Start From an Existing Service{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </>
                }
                htmlFor="service-preset"
                help="Fills in this form from an existing service."
              >
                <Select
                  name="service_preset"
                  value={presetCode}
                  onValueChange={onPresetChange}
                >
                  <SelectTrigger id="service-preset" className="w-full">
                    <SelectValue placeholder="Copy fields from a charter service…">
                      {(value) =>
                        services.find((entry) => entry.service_code === value)
                          ?.name
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {services.map((entry) => (
                        <SelectItem
                          key={entry.service_code}
                          value={entry.service_code}
                        >
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </SettingRow>
            ) : null}

            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <SettingRow
                  label="Service Name"
                  htmlFor="service-name"
                  help="The full official name of the service."
                  error={fieldState.invalid ? fieldState.error : undefined}
                >
                  <Input
                    {...field}
                    id="service-name"
                    placeholder="Issuance of Certified True Copies of Civil Registry Records…"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                </SettingRow>
              )}
            />

            <Controller
              control={form.control}
              name="service_code"
              render={({ field, fieldState }) => (
                <SettingRow
                  label="Service Code"
                  htmlFor="service-code"
                  help={
                    isEdit
                      ? "Can’t be changed. Requests use this code."
                      : "Can’t be changed after the service is created."
                  }
                  error={fieldState.invalid ? fieldState.error : undefined}
                >
                  <Input
                    {...field}
                    id="service-code"
                    placeholder="CTC-LOCAL…"
                    className="font-mono uppercase"
                    disabled={isEdit}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={fieldState.invalid}
                    onChange={(event) =>
                      field.onChange(event.target.value.toUpperCase())
                    }
                  />
                </SettingRow>
              )}
            />
          </SettingGroup>

          <SettingGroup title="Fees & Processing">
            <Controller
              control={form.control}
              name="fee"
              render={({ field, fieldState }) => (
                <SettingRow
                  label={feePerCopy ? "Fee per Copy" : "Total Fee"}
                  htmlFor="service-fee"
                  help={feePerCopy ? "Charged for each copy requested." : null}
                  error={fieldState.invalid ? fieldState.error : undefined}
                >
                  <InputGroup>
                    <InputGroupAddon>
                      <PhilippinePeso size={16} />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="service-fee"
                      type="number"
                      inputMode="decimal"
                      placeholder="100.00…"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                    />
                  </InputGroup>
                </SettingRow>
              )}
            />

            <Controller
              control={form.control}
              name="fee_per_copy"
              render={({ field }) => (
                <Field
                  orientation="horizontal"
                  className="gap-6 py-5 has-[>[data-slot=field-content]]:items-start sm:has-[>[data-slot=field-content]]:items-center"
                >
                  <FieldContent className="min-w-0 max-w-[66ch]">
                    <FieldLabel htmlFor="service-fee-per-copy">
                      Allow multiple copies
                    </FieldLabel>
                    <FieldDescription>
                      Applicants choose how many copies to request. The fee is
                      charged for each, and the fee breakdown is hidden.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="service-fee-per-copy"
                    name={field.name}
                    className="ml-auto shrink-0"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="classification"
              render={({ field, fieldState }) => (
                <SettingRow
                  label="Classification"
                  htmlFor="service-classification"
                  help={
                    SERVICE_CLASSIFICATIONS.find(
                      (classification) => classification.value === field.value,
                    )?.hint
                  }
                  error={fieldState.invalid ? fieldState.error : undefined}
                >
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="service-classification"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Classification…">
                        {(value) =>
                          SERVICE_CLASSIFICATIONS.find(
                            (classification) => classification.value === value,
                          )?.label
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {SERVICE_CLASSIFICATIONS.map((classification) => (
                          <SelectItem
                            key={classification.value}
                            value={classification.value}
                          >
                            {classification.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </SettingRow>
              )}
            />

            <Controller
              control={form.control}
              name="processing_time"
              render={({ field, fieldState }) => (
                <SettingRow
                  label="Processing Time"
                  htmlFor="service-processing-time"
                  help="Include any posting or publication wait."
                  error={fieldState.invalid ? fieldState.error : undefined}
                >
                  <Input
                    {...field}
                    id="service-processing-time"
                    placeholder="2 hours…"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                </SettingRow>
              )}
            />

            <Controller
              control={form.control}
              name="department_id"
              render={({ field, fieldState }) => (
                <SettingRow
                  label="Handling Department"
                  htmlFor="service-department"
                  help="The office that processes requests for this service."
                  error={fieldState.invalid ? fieldState.error : undefined}
                >
                  <Select
                    name={field.name}
                    value={field.value ?? UNASSIGNED_DEPARTMENT_VALUE}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="service-department"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Unassigned…">
                        {(value) =>
                          departments.find(
                            (department) => department.id === value,
                          )?.name ?? "Unassigned"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                        <SelectItem value={UNASSIGNED_DEPARTMENT_VALUE}>
                          Unassigned
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </SettingRow>
              )}
            />
          </SettingGroup>
          <FeeBreakdownFields />
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
