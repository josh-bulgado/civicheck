import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone } from "lucide-react";
import {
  Field,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { RequestSummaryCard } from "~/features/apply/components/RequestSummaryCard";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/details")({
  component: DetailsStepRoute,
});

const detailsSchema = z.object({
  subjectFirstName: z.string().min(1, "First name is required"),
  subjectMiddleName: z.string(),
  subjectLastName: z.string().min(1, "Last name is required"),
  subjectSuffix: z.string(),
  subjectSex: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Select the sex on record" }),
  }),
  contactNumber: z
    .string()
    .refine(
      (value) => value === "" || /^9\d{9}$/.test(value),
      "Enter a valid 10-digit mobile number, e.g. 9171234567",
    ),
});

type DetailsValues = z.infer<typeof detailsSchema>;

// The draft stores "no suffix" as an empty string, but Base UI reads an empty
// value as "nothing selected" and renders no label for it, so the option needs
// a real value that is mapped back to "" on the way in and out.
const NO_SUFFIX = "none";

// Generational suffixes as they appear on PSA civil registry records.
const SUFFIXES = [
  { value: NO_SUFFIX, label: "None" },
  { value: "Jr.", label: "Jr." },
  { value: "Sr.", label: "Sr." },
  { value: "II", label: "II" },
  { value: "III", label: "III" },
  { value: "IV", label: "IV" },
  { value: "V", label: "V" },
];

// No "unspecified" value is accepted by the schema — this sentinel only
// gives the Select a real item to resolve while nothing has been chosen yet,
// the same trick used for suffix above.
const NO_SEX = "unspecified";

const SEXES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const SEX_ITEMS = [{ value: NO_SEX, label: "Select sex" }, ...SEXES];

function DetailsStepRoute() {
  const { serviceCode } = Route.useParams();
  const navigate = useNavigate();
  const { displayName, services } = ApplyLayoutRoute.useLoaderData();
  const { draft, update } = useApplyDraft(serviceCode);
  const selectedService =
    services.find((s) => s.service_code === draft.selectedServiceCode) ?? services[0];

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    mode: "onBlur",
    values: {
      subjectFirstName: draft.details.subjectFirstName,
      subjectMiddleName: draft.details.subjectMiddleName,
      subjectLastName: draft.details.subjectLastName,
      subjectSuffix: draft.details.subjectSuffix,
      subjectSex: draft.details.subjectSex as "male" | "female",
      contactNumber: draft.details.contactNumber,
    },
  });

  function onSubmit(values: DetailsValues) {
    update((prev) => ({ details: { ...prev.details, ...values } }));
    navigate({ to: "/apply/$serviceCode/case", params: { serviceCode } });
  }

  return (
    <WizardShell
      step={1}
      title="Who is this document for?"
      description="Enter the full name of the person named on the civil registry record, exactly as it should appear."
      sidebar={
        selectedService && (
          <RequestSummaryCard serviceName={displayName} fee={selectedService.fee} />
        )
      }
    >
      <div className="flex flex-col gap-6">
        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="subjectFirstName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="subjectFirstName">First name</FieldLabel>
                  <Input id="subjectFirstName" placeholder="Juan" {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="subjectMiddleName"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="subjectMiddleName">Middle name</FieldLabel>
                  <Input id="subjectMiddleName" placeholder="Santos" {...field} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="subjectLastName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="subjectLastName">Last name</FieldLabel>
                  <Input id="subjectLastName" placeholder="Dela Cruz" {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="subjectSuffix"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="subjectSuffix">Suffix</FieldLabel>
                  <Select
                    // Without `items`, the trigger prints the raw value ("none")
                    // instead of the option's label ("None").
                    items={SUFFIXES}
                    // `values` only lands once the draft hydrates, so an empty
                    // or missing suffix both read as the "None" option.
                    value={field.value || NO_SUFFIX}
                    onValueChange={(value) =>
                      field.onChange(value === NO_SUFFIX ? "" : value)
                    }
                  >
                    <SelectTrigger id="subjectSuffix" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUFFIXES.map((suffix) => (
                        <SelectItem key={suffix.label} value={suffix.value}>
                          {suffix.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="subjectSex"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="subjectSex">Sex</FieldLabel>
                  <Select<"male" | "female" | typeof NO_SEX>
                    items={SEX_ITEMS}
                    value={field.value || NO_SEX}
                    onValueChange={(value) =>
                      field.onChange(value === NO_SEX ? "" : value)
                    }
                  >
                    <SelectTrigger id="subjectSex" className="w-full">
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEX_ITEMS.map((sex) => (
                        <SelectItem key={sex.value} value={sex.value}>
                          {sex.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="contactNumber"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="contactNumber">Contact number (optional)</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Phone size={16} aria-hidden="true" />
                    <InputGroupText>+63</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    id="contactNumber"
                    inputMode="numeric"
                    placeholder="9171234567"
                    aria-invalid={fieldState.invalid}
                  />
                </InputGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <WizardFooterActions
          onContinue={form.handleSubmit(onSubmit)}
          continueLabel="Continue to case details"
        />
      </div>
    </WizardShell>
  );
}
