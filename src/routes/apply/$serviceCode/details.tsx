import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";

export const Route = createFileRoute("/apply/$serviceCode/details")({
  component: DetailsStepRoute,
});

const detailsSchema = z.object({
  subjectFirstName: z.string().min(1, "First name is required"),
  subjectMiddleName: z.string(),
  subjectLastName: z.string().min(1, "Last name is required"),
  subjectSuffix: z.string(),
});

type DetailsValues = z.infer<typeof detailsSchema>;

function DetailsStepRoute() {
  const { serviceCode } = Route.useParams();
  const navigate = useNavigate();
  const { draft, update, hydrated } = useApplyDraft(serviceCode);

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    mode: "onBlur",
    values: hydrated
      ? {
          subjectFirstName: draft.details.subjectFirstName,
          subjectMiddleName: draft.details.subjectMiddleName,
          subjectLastName: draft.details.subjectLastName,
          subjectSuffix: draft.details.subjectSuffix,
        }
      : undefined,
  });

  function onSubmit(values: DetailsValues) {
    update((prev) => ({ details: { ...prev.details, ...values } }));
    navigate({ to: "/apply/$serviceCode/case", params: { serviceCode } });
  }

  return (
    <WizardShell
      title="Who is this document for?"
      description="Enter the full name of the person named on the civil registry record, exactly as it should appear."
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
                  <Input id="subjectFirstName" placeholder="e.g. Juan" {...field} />
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
                  <Input id="subjectMiddleName" placeholder="e.g. Santos" {...field} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="subjectLastName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="subjectLastName">Last name</FieldLabel>
                  <Input id="subjectLastName" placeholder="e.g. Dela Cruz" {...field} />
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
                  <Input id="subjectSuffix" placeholder="e.g. Jr." {...field} />
                </Field>
              )}
            />
          </div>
        </FieldGroup>

        <WizardFooterActions
          onContinue={form.handleSubmit(onSubmit)}
          continueLabel="Continue to case details"
        />
      </div>
    </WizardShell>
  );
}
