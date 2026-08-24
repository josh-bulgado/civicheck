import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import {
  impliedSex,
  reconcileSubjects,
  subjectsMatchRoles,
} from "~/lib/subject-fields";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/details")({
  component: DetailsStepRoute,
});

const subjectSchema = z.object({
  role: z.string(),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string(),
  sex: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Select the sex on record" }),
  }),
});

const detailsSchema = z.object({
  subjects: z.array(subjectSchema).min(1),
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

/** The name/suffix/sex inputs for one subject — reused for both the plain
 * single-subject layout and each accordion item when there's more than one. */
function SubjectFieldGrid({
  control,
  setValue,
  index,
  role,
}: {
  control: Control<DetailsValues>;
  setValue: UseFormSetValue<DetailsValues>;
  index: number;
  role: string;
}) {
  const skipSex = impliedSex(role) !== null;
  // Generational suffixes (Jr., Sr., III...) are a male naming convention —
  // don't ask for one on a role that's implied to be a woman, or once the
  // applicant has picked "Female" for a role (like Child) where sex isn't
  // implied and is chosen instead.
  const watchedSex = useWatch({ control, name: `subjects.${index}.sex` });
  const skipSuffix = (impliedSex(role) ?? watchedSex) === "female";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Controller
        control={control}
        name={`subjects.${index}.firstName`}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`subject-${index}-firstName`}>First name</FieldLabel>
            <Input
              id={`subject-${index}-firstName`}
              placeholder="Juan"
              autoComplete="off"
              {...field}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={control}
        name={`subjects.${index}.middleName`}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={`subject-${index}-middleName`}>Middle name</FieldLabel>
            <Input
              id={`subject-${index}-middleName`}
              placeholder="Santos"
              autoComplete="off"
              {...field}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name={`subjects.${index}.lastName`}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`subject-${index}-lastName`}>Last name</FieldLabel>
            <Input
              id={`subject-${index}-lastName`}
              placeholder="Dela Cruz"
              autoComplete="off"
              {...field}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      {!skipSuffix && (
        <Controller
          control={control}
          name={`subjects.${index}.suffix`}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={`subject-${index}-suffix`}>Suffix</FieldLabel>
              <Select
                items={SUFFIXES}
                value={field.value || NO_SUFFIX}
                onValueChange={(value) =>
                  field.onChange(value === NO_SUFFIX ? "" : value)
                }
              >
                <SelectTrigger
                  id={`subject-${index}-suffix`}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SUFFIXES.map((suffix) => (
                      <SelectItem key={suffix.label} value={suffix.value}>
                        {suffix.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      )}
      {!skipSex && (
        <Controller
          control={control}
          name={`subjects.${index}.sex`}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`subject-${index}-sex`}>Sex</FieldLabel>
              <Select<"male" | "female" | typeof NO_SEX>
                items={SEX_ITEMS}
                value={(field.value as "male" | "female" | "") || NO_SEX}
                onValueChange={(value) => {
                  const next = value === NO_SEX ? "" : value;
                  field.onChange(next);
                  // Suffix disappears the moment this role is female — clear
                  // it right here instead of letting a stray value ride
                  // along in `form_data` unseen.
                  if (next === "female") {
                    setValue(`subjects.${index}.suffix`, "");
                  }
                }}
              >
                <SelectTrigger
                  id={`subject-${index}-sex`}
                  className="w-full"
                >
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SEX_ITEMS.map((sex) => (
                      <SelectItem key={sex.value} value={sex.value}>
                        {sex.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}
    </div>
  );
}

function DetailsStepRoute() {
  const { serviceCode } = Route.useParams();
  const navigate = useNavigate();
  const { services } = ApplyLayoutRoute.useLoaderData();
  const { draft, update, hydrated } = useApplyDraft(serviceCode);
  const selectedService =
    services.find((s) => s.service_code === draft.selectedServiceCode) ?? services[0];
  const roles = selectedService?.party_roles?.length
    ? selectedService.party_roles
    : ["Subject"];

  // Most services ask about one person; Marriage License asks about two. Keep
  // `draft.subjects` in sync with whichever service is selected, preserving
  // anything already typed when the count/roles match.
  useEffect(() => {
    if (!hydrated) return;
    if (subjectsMatchRoles(draft.subjects, roles)) return;
    update((prev) => ({ subjects: reconcileSubjects(prev.subjects, roles) }));
    // `roles` is a new array each render (derived from loader data), so key
    // the effect on its contents instead of its reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, roles.join("|"), draft.subjects, update]);

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    mode: "onBlur",
    values: {
      subjects: reconcileSubjects(
        draft.subjects,
        roles,
      ) as DetailsValues["subjects"],
      contactNumber: draft.contactNumber,
    },
  });

  const subjectFields = useFieldArray({ control: form.control, name: "subjects" });
  const showRoleLabels = subjectFields.fields.length > 1;

  // Keep sections user-controlled. Automatically collapsing a completed person
  // can hide a mistake immediately after the applicant leaves a field.
  const fieldIds = subjectFields.fields.map((f) => f.id).join("|");
  const [openIds, setOpenIds] = useState<string[]>(() =>
    subjectFields.fields[0] ? [subjectFields.fields[0].id] : [],
  );

  // Re-derive which section starts open whenever the resolved role set
  // changes shape — adjusted here during render rather than in an effect,
  // so it lands in the same commit instead of causing an extra render pass.
  const [seenFieldIds, setSeenFieldIds] = useState(fieldIds);
  if (fieldIds !== seenFieldIds) {
    setSeenFieldIds(fieldIds);
    setOpenIds(subjectFields.fields[0] ? [subjectFields.fields[0].id] : []);
  }

  function onSubmit(values: DetailsValues) {
    update(() => ({ subjects: values.subjects, contactNumber: values.contactNumber }));
    navigate({ to: "/apply/$serviceCode/documents", params: { serviceCode } });
  }

  return (
    <WizardShell
      step={2}
      title="Who is this document for?"
      description={
        showRoleLabels
          ? "Enter each party's full name exactly as it should appear on the civil registry record."
          : "Enter the full name of the person named on the civil registry record, exactly as it should appear."
      }
    >
      <div className="flex flex-col gap-6">
        {showRoleLabels ? (
          <Accordion multiple value={openIds} onValueChange={setOpenIds}>
            {subjectFields.fields.map((subjectField, index) => (
              <AccordionItem key={subjectField.id} value={subjectField.id}>
                <AccordionTrigger>
                  {subjectField.role}&rsquo;s information
                </AccordionTrigger>
                <AccordionContent>
                  <SubjectFieldGrid
                    control={form.control}
                    setValue={form.setValue}
                    index={index}
                    role={subjectField.role}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          subjectFields.fields.map((subjectField, index) => (
            <FieldGroup key={subjectField.id}>
              <SubjectFieldGrid
                control={form.control}
                setValue={form.setValue}
                index={index}
                role={subjectField.role}
              />
            </FieldGroup>
          ))
        )}

        <FieldGroup>
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
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
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
          onBack={() =>
            navigate({ to: "/apply/$serviceCode/case", params: { serviceCode } })
          }
          onContinue={form.handleSubmit(onSubmit)}
          continueLabel="Continue to documents"
        />
      </div>
    </WizardShell>
  );
}
