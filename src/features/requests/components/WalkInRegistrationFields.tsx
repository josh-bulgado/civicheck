import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  SubjectFieldGrid,
  type DetailsValues,
} from "~/features/apply/components/DetailsStep";
import { DynamicFormFields } from "~/features/forms/components/DynamicFormFields";
import { DerivedAnswerAlerts } from "~/features/forms/components/DerivedAnswerAlerts";
import { EventTimingNotice } from "~/features/forms/components/EventTimingNotice";
import type { TemplateAnswers } from "~/features/forms/form-template.types";
import {
  deriveTemplateAnswers,
  evaluateTemplateEventTiming,
  canonicalizeTemplateAnswers,
} from "~/features/forms/form-template.utils";
import { emptySubject, reconcileSubjects } from "~/lib/subject-fields";
import type { EncodableService } from "../walk-in-intake.queries";
import { prepareWalkInBirth } from "../walk-in-birth";
import { isWalkInPetition, prepareWalkInPetition } from "../walk-in-petition";
import { walkInCaseForService } from "../walk-in-legitimation";
import { prepareWalkInCourtDecree } from "../walk-in-court-decree";
import { prepareWalkInSupplemental } from "../walk-in-supplemental";
import { isWalkInCourtDecree, isWalkInDeath, isWalkInMarriage } from "../walk-in-registration";

export function WalkInRegistrationFields({
  service,
  submitting,
  onSubmit,
  onCancel,
  onAnswersChange,
}: {
  service: EncodableService;
  submitting: boolean;
  onSubmit: (data: {
    serviceCode: string;
    subjects: ReturnType<typeof emptySubject>[];
    answers: TemplateAnswers;
    templateVersionId: string | null;
    physicalDocumentsConfirmed: boolean;
    petitionAuthorityConfirmed?: boolean;
    coupleAppearanceConfirmed?: boolean;
    personalAppearanceConfirmed?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  onAnswersChange: (answers: TemplateAnswers) => void;
}) {
  const [error, setError] = useState("");
  const [physicalDocumentsConfirmed, setPhysicalDocumentsConfirmed] = useState(false);
  const [petitionAuthorityConfirmed, setPetitionAuthorityConfirmed] = useState(false);
  const [coupleAppearanceConfirmed, setCoupleAppearanceConfirmed] = useState(false);
  const [personalAppearanceConfirmed, setPersonalAppearanceConfirmed] = useState(false);
  const form = useForm<DetailsValues>({
    defaultValues: {
      ...Object.fromEntries((service.registrationForm?.definition.sections ?? [])
        .flatMap((section) => section.fields)
        .filter((field) => field.type !== "person_group")
        .map((field) => [field.key, ""])),
      subjects: service.partyRoles.map(emptySubject),
    },
  });
  const template = service.registrationForm;
  const courtDecree = isWalkInCourtDecree(service.serviceCode);
  const marriage = isWalkInMarriage(service.serviceCode);
  const marriageLicense = service.serviceCode === "MARRIAGE_LICENSE";
  const death = isWalkInDeath(service.serviceCode);
  const legitimation = service.serviceCode === "LEGITIMATION";
  const petition = isWalkInPetition(service.serviceCode);
  const surnameChange = service.serviceCode === "RA9255_SURNAME";
  const supplemental = service.serviceCode === "SUPPLEMENTAL_REPORT";
  useEffect(() => {
    if (!template) return;
    const selectedCase = walkInCaseForService(template.definition, service.serviceCode);
    const publish = () => {
      const text = Object.fromEntries(Object.entries(form.getValues()).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ));
      onAnswersChange(canonicalizeTemplateAnswers(selectedCase.definition, { ...selectedCase.answers, ...text }));
    };
    publish();
    const subscription = form.watch(() => {
      setPhysicalDocumentsConfirmed(false);
      setPetitionAuthorityConfirmed(false);
      setCoupleAppearanceConfirmed(false);
      setPersonalAppearanceConfirmed(false);
      publish();
    });
    return () => subscription.unsubscribe();
  }, [form, template, service.serviceCode, onAnswersChange]);
  if (!template)
    return (
      <Alert>
        <AlertDescription>
          The registration form is unavailable. Reload the page and try again.
        </AlertDescription>
      </Alert>
    );
  const { definition, answers: caseAnswers } = walkInCaseForService(template.definition, service.serviceCode);
  const caseDefinition = {
    ...definition,
    sections: definition.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        if (field.key === "event_date") return { ...field, helpText: undefined };
        if (marriage && field.key === "event_place") return {
          ...field,
          placeholder: "e.g. St. Gregory the Great Cathedral, Legazpi City, Albay",
        };
        return field;
      }),
    })),
  };
  const watched = form.watch();
  const textValues = Object.fromEntries(
    Object.entries(watched).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const values = Object.fromEntries(
    Object.entries(
      deriveTemplateAnswers(definition, { ...caseAnswers, ...textValues }),
    ).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const roles = service.partyRoles;
  const personFields = definition.sections
    .flatMap((section) => section.fields)
    .filter((field) => field.type === "person_group");
  const timing = evaluateTemplateEventTiming(definition, values);

  async function submit() {
    if (petition && !petitionAuthorityConfirmed) {
      setError("Confirm that the petitioner's identity and authority to file were checked.");
      return;
    }
    if (surnameChange && !personalAppearanceConfirmed) {
      setError("Confirm the required personal appearance, signatures, and attestation for the child's age before encoding.");
      return;
    }
    if (supplemental && !personalAppearanceConfirmed) {
      setError("Confirm the applicant's personal appearance before encoding.");
      return;
    }
    if (legitimation && !coupleAppearanceConfirmed) {
      setError("Confirm that both parents personally appeared before encoding.");
      return;
    }
    if (marriageLicense && !coupleAppearanceConfirmed) {
      setError("Confirm that both applicants personally appeared before encoding.");
      return;
    }
    if (!physicalDocumentsConfirmed) {
      setError("Check and accept the physical documents before encoding.");
      return;
    }
    if (submitting || !template || !(await form.trigger())) return;
    const current = form.getValues();
    const subjects = reconcileSubjects(current.subjects, roles);
    const answers: TemplateAnswers = {
      ...caseAnswers,
      ...Object.fromEntries(
        Object.entries(current).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
    };
    for (const field of personFields) answers[field.key] = subjects;
    const prepare = supplemental ? prepareWalkInSupplemental : courtDecree ? prepareWalkInCourtDecree : prepareWalkInBirth;
    const prepared = (petition ? prepareWalkInPetition : prepare)(definition, answers, roles);
    if (prepared.error) {
      setError(prepared.message);
      return;
    }
    setError("");
    await onSubmit({
      serviceCode: service.serviceCode,
      subjects,
      answers,
      templateVersionId: template.versionId,
      physicalDocumentsConfirmed,
      ...(petition ? { petitionAuthorityConfirmed } : {}),
      ...(legitimation || marriageLicense ? { coupleAppearanceConfirmed } : {}),
      ...(supplemental || surnameChange ? { personalAppearanceConfirmed } : {}),
    });
  }

  return (
    <fieldset disabled={submitting} className="min-w-0 space-y-6">
      {!marriageLicense ? <p className="text-sm text-muted-foreground">
        {petition
          ? "Copy the petition details from the papers. Record the owner's name and sex as currently written on the record. Check filing documents and authority to file. Publication and PSA affirmation are completed later."
          : surnameChange
          ? "Enter the child's name as recorded on the birth certificate and both parents' names. Check the physical papers and the signing and personal appearance requirements for the child's age."
          : supplemental
          ? "Enter the details from the civil registry certificate and supplemental affidavit. Check the required originals and copies, and confirm personal appearance."
          : courtDecree
          ? "Enter the decision details and names exactly as shown on the court papers. Check the four-copy requirements and the additional certificate if another court issued the decision."
          : legitimation
          ? "Enter the child's and parents' details from the birth and marriage certificates. Check the physical papers and the couple's personal appearance."
          : <>Enter the visitor's {death ? "death" : marriage ? "marriage" : "birth"} registration details. Check the applicant’s physical documents.</>}
      </p> : null}
      {surnameChange ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Personal appearance: mother/legal guardian for ages 0-7; child with notarized attestation of the mother/legal guardian for ages 7-17; child for ages 18 and above. The Charter includes age 7 in both ranges; staff determine the applicable signing requirement.</p>
          <p>The base fee is {service.fee.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}. Also payable: ₱100 if with paternity and ₱5 per certified-photocopy page. Confirm additional charges from the papers.</p>
        </div>
      ) : null}
      <DynamicFormFields
        definition={caseDefinition}
        step="case"
        singleColumn={marriage || death || legitimation || courtDecree || supplemental || surnameChange || petition}
        control={form.control}
        values={values}
        showRequiredMarks
        onFieldChange={(key, value) =>
          form.setValue(key, value, { shouldValidate: true })
        }
      />
      <DerivedAnswerAlerts definition={definition} answers={values} compact={marriageLicense} />
      {timing?.evaluation.mismatched ? (
        <EventTimingNotice
          behavior={timing.rule.behavior}
          title={timing.rule.title}
          description={`${timing.rule.description} Choose the matching registration under Service requested above.`}
          ctaLabel=""
        />
      ) : null}
      <DynamicFormFields
        definition={definition}
        step="details"
        control={form.control}
        values={values}
        showRequiredMarks
        onFieldChange={(key, value) =>
          form.setValue(key, value, { shouldValidate: true })
        }
        renderSectionLead={(section) =>
          section.fields.some((field) => field.type === "person_group") ? (
            <div className="space-y-6">
              {roles.map((role, index) => (
                <div key={role} className="space-y-3">
                  <h3 className="font-bold">
                    {role.toLowerCase() === "mother"
                      ? "Mother's Maiden Name"
                      : petition || supplemental ? "Person named on the record"
                      : surnameChange && role === "Child" ? "Child's name on the birth certificate"
                      : death ? "Name of the deceased"
                      : marriage ? ({ Bride: "Maiden Name of Wife", Groom: "Husband" }[role] ?? role) : role}
                  </h3>
                  <SubjectFieldGrid
                    control={form.control}
                    setValue={form.setValue}
                    index={index}
                    role={role}
                    hideSex={courtDecree || supplemental}
                    requireMiddleName
                  />
                </div>
              ))}
            </div>
          ) : null
        }
      />
      <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <Checkbox className="mt-0.5" checked={physicalDocumentsConfirmed}
          onCheckedChange={(checked) => setPhysicalDocumentsConfirmed(checked === true)} />
        <span>{petition
          ? "I checked the physical documents required at filing. They are complete and acceptable for initial processing. Publication documents will be checked at the appropriate later step."
          : courtDecree
          ? "I checked the required four copies of the court papers and, for a decision outside RTC Legazpi, the Certificate of Registration and Authenticity. The papers are complete and acceptable."
          : "I checked the physical documents. The required papers are complete and acceptable."}</span>
      </label>
      {legitimation || marriageLicense ? (
        <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <Checkbox className="mt-0.5" checked={coupleAppearanceConfirmed}
            onCheckedChange={(checked) => setCoupleAppearanceConfirmed(checked === true)} />
          <span>{marriageLicense ? "Both applicants personally appeared." : "Both parents personally appeared."}</span>
        </label>
      ) : null}
      {supplemental || surnameChange ? (
        <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <Checkbox className="mt-0.5" checked={personalAppearanceConfirmed}
            onCheckedChange={(checked) => setPersonalAppearanceConfirmed(checked === true)} />
          <span>{surnameChange
            ? "I verified the required personal appearance, signatures, and attestation for the child's age."
            : "The applicant personally appeared."}</span>
        </label>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {petition ? (
        <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <Checkbox className="mt-0.5" checked={petitionAuthorityConfirmed}
            onCheckedChange={(checked) => setPetitionAuthorityConfirmed(checked === true)} />
          <span>I checked the petitioner's identity and authority to file this petition.</span>
        </label>
      ) : null}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !physicalDocumentsConfirmed || (petition && !petitionAuthorityConfirmed) || ((legitimation || marriageLicense) && !coupleAppearanceConfirmed) || ((supplemental || surnameChange) && !personalAppearanceConfirmed)}
        >
          {submitting ? "Encoding..." : "Encode request"}
        </Button>
      </div>
    </fieldset>
  );
}
