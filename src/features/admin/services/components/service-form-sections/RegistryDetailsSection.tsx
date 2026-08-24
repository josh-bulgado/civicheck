import { Controller, useFormContext } from "react-hook-form";
import { Copy, FileText } from "lucide-react";
import type { Department } from "~/features/admin/departments.queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
} from "~/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Service } from "../../services.types";
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
}

export function RegistryDetailsSection({
  services,
  departments,
  isEdit,
  presetCode,
  onPresetChange,
}: RegistryDetailsSectionProps) {
  const form = useFormContext<ServiceFormValues>();

  return (
    <Card id="registry-details" className="scroll-mt-6">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <FileText aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>
              <h2 className="text-pretty">Registry Details</h2>
            </CardTitle>
            <CardDescription>
              The official identity, owner, fee, and Citizen&rsquo;s Charter
              classification.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {!isEdit ? (
            <Field>
              <FieldLabel htmlFor="service-preset">
                Start From an Existing Service{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <Select
                name="service_preset"
                value={presetCode}
                onValueChange={onPresetChange}
              >
                <SelectTrigger id="service-preset">
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
              <FieldDescription>
                <span className="flex items-center gap-1.5">
                  <Copy aria-hidden="true" className="size-3" />
                  Copies everything except the service code, which must be
                  unique.
                </span>
              </FieldDescription>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="service_code"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="service-code">Service Code</FieldLabel>
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
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription>
                      {isEdit
                        ? "Permanent — requests reference this code."
                        : "Permanent identifier. Cannot be changed later."}
                    </FieldDescription>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="fee"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="service-fee">Total Fee</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <span aria-hidden="true">&#8369;</span>
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
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription>
                      The charter&rsquo;s Total row. Enter 0 if free.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="service-name">Service Name</FieldLabel>
                <Input
                  {...field}
                  id="service-name"
                  placeholder="Issuance of Certified True Copies of Civil Registry Records…"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="classification"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="service-classification">
                    Classification
                  </FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="service-classification"
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
                  <FieldDescription>
                    {
                      SERVICE_CLASSIFICATIONS.find(
                        (classification) =>
                          classification.value === field.value,
                      )?.hint
                    }
                  </FieldDescription>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="processing_time"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="service-processing-time">
                    Processing Time
                  </FieldLabel>
                  <Input
                    {...field}
                    id="service-processing-time"
                    placeholder="2 hours…"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription>
                      Include any posting or publication wait.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="department_id"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="service-department">
                    Handling Department
                  </FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value ?? UNASSIGNED_DEPARTMENT_VALUE}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="service-department"
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
                  <FieldDescription>
                    Which CCRO department requests for this service are routed
                    to.
                  </FieldDescription>
                </Field>
              )}
            />
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
