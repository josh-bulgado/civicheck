import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CaseSelector } from "~/features/services/components/CaseSelector";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/apply/$serviceCode/case")({
  component: CaseStepRoute,
});

const PURPOSES = [
  "Local Use (ID, Barangay, etc.)",
  "Employment",
  "Passport / Travel",
  "School Records / Admission",
  "Social Security (SSS/GSIS/etc.)",
  "Legal / Court proceedings",
  "Other",
];

const caseSchema = z
  .object({
    eventDate: z.string().min(1, "Date of event is required"),
    eventPlace: z.string().min(1, "Place of event is required"),
    purpose: z.string().min(1),
    otherPurpose: z.string(),
    additionalNotes: z.string(),
  })
  .refine((v) => v.purpose !== "Other" || v.otherPurpose.trim().length > 0, {
    message: "Please specify the purpose",
    path: ["otherPurpose"],
  });

type CaseValues = z.infer<typeof caseSchema>;

function CaseStepRoute() {
  const { serviceCode } = Route.useParams();
  const navigate = useNavigate();
  const { isGroup, services } = ApplyLayoutRoute.useLoaderData();
  const { draft, update, hydrated } = useApplyDraft(serviceCode);

  useEffect(() => {
    if (hydrated && !isGroup && !draft.selectedServiceCode) {
      update({ selectedServiceCode: services[0].service_code });
    }
  }, [hydrated, isGroup, draft.selectedServiceCode, services, update]);

  const form = useForm<CaseValues>({
    resolver: zodResolver(caseSchema),
    mode: "onBlur",
    values: hydrated
      ? {
          eventDate: draft.details.eventDate,
          eventPlace: draft.details.eventPlace,
          purpose: draft.caseAnswers.purpose,
          otherPurpose: draft.caseAnswers.otherPurpose,
          additionalNotes: draft.caseAnswers.additionalNotes,
        }
      : undefined,
  });

  const purpose = form.watch("purpose");

  function onSubmit(values: CaseValues) {
    update((prev) => ({
      details: {
        ...prev.details,
        eventDate: values.eventDate,
        eventPlace: values.eventPlace,
      },
      caseAnswers: {
        purpose: values.purpose,
        otherPurpose: values.otherPurpose,
        additionalNotes: values.additionalNotes,
      },
    }));
    navigate({ to: "/apply/$serviceCode/documents", params: { serviceCode } });
  }

  return (
    <WizardShell
      title="Tell us about your case"
      description="A few details about the event and why you need this document — this determines which requirements apply to you."
    >
      <div className="flex flex-col gap-6">
        {isGroup && (
          <CaseSelector
            services={services}
            selectedCode={draft.selectedServiceCode}
            onSelect={(code) => update({ selectedServiceCode: code })}
          />
        )}

        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="eventDate"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="eventDate">Date of event</FieldLabel>
                  <Input id="eventDate" type="date" {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="eventPlace"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="eventPlace">Place of event</FieldLabel>
                  <Input id="eventPlace" placeholder="e.g. Legazpi City, Albay" {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="purpose">Purpose of request</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          {purpose === "Other" && (
            <Controller
              control={form.control}
              name="otherPurpose"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="otherPurpose">Specify purpose</FieldLabel>
                  <Input id="otherPurpose" {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}

          <Controller
            control={form.control}
            name="additionalNotes"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="additionalNotes">
                  Additional notes (optional)
                </FieldLabel>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any special requests or instructions..."
                  rows={3}
                  {...field}
                />
              </Field>
            )}
          />
        </FieldGroup>

        <WizardFooterActions
          onBack={() =>
            navigate({ to: "/apply/$serviceCode/details", params: { serviceCode } })
          }
          onContinue={form.handleSubmit(onSubmit)}
          continueLabel="Continue to documents"
          continueDisabled={isGroup && !draft.selectedServiceCode}
        />
      </div>
    </WizardShell>
  );
}
