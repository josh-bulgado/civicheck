import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  SubjectFieldGrid,
  type DetailsValues,
} from "~/features/apply/components/DetailsStep";
import { DynamicFormFields } from "~/features/forms/components/DynamicFormFields";
import { FORM_GROUP_CLASS } from "~/features/forms/components/wizard-field";
import { formatNameHeading } from "~/features/forms/field-label";
import { staffCopy, staffFormDefinition } from "~/features/forms/staff-copy";
import { DerivedAnswerAlerts } from "~/features/forms/components/DerivedAnswerAlerts";
import { EventTimingNotice } from "~/features/forms/components/EventTimingNotice";
import type { TemplateAnswers } from "~/features/forms/form-template.types";
import {
  deriveTemplateAnswers,
  evaluateTemplateEventTiming,
  canonicalizeTemplateAnswers,
} from "~/features/forms/form-template.utils";
import { emptySubject, reconcileSubjects } from "~/lib/subject-fields";
import { surnameChangeCaseDefinition, surnameChangeSigningInstruction } from "~/features/services/surname-change";
import type { EncodableService } from "../walk-in-intake.queries";
import { prepareWalkInBirth } from "../walk-in-birth";
import { isWalkInPetition, petitionWalkInAnswers, prepareWalkInPetition } from "../walk-in-petition";
import { petitionDetailsLayout } from "~/features/services/petition-selection";
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
    coupleAppearanceConfirmed?: boolean;
    personalAppearanceConfirmed?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  onAnswersChange: (answers: TemplateAnswers) => void;
}) {
  const [error, setError] = useState("");
  const [physicalDocumentsConfirmed, setPhysicalDocumentsConfirmed] = useState(false);
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
  const watched = useWatch({ control: form.control });
  const template = service.registrationForm;
  const courtDecree = isWalkInCourtDecree(service.serviceCode);
  const marriage = isWalkInMarriage(service.serviceCode);
  const marriageLicense = service.serviceCode === "MARRIAGE_LICENSE";
  const death = isWalkInDeath(service.serviceCode);
  const legitimation = service.serviceCode === "LEGITIMATION";
  const petition = isWalkInPetition(service.serviceCode);
  const surnameChange = service.serviceCode === "RA9255_SURNAME";
  const supplemental = service.serviceCode === "SUPPLEMENTAL_REPORT";
  const otherCertificate = service.serviceCode === "OTHER_CERT";
  const endorsement = service.serviceCode === "ELEC_ENDORSEMENT";
  useEffect(() => {
    if (!template) return;
    const selectedCase = walkInCaseForService(template.definition, service.serviceCode);
    const publish = () => {
      const text = Object.fromEntries(Object.entries(form.getValues()).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ));
      const answers = { ...selectedCase.answers, ...text };
      onAnswersChange(canonicalizeTemplateAnswers(selectedCase.definition,
        petition ? petitionWalkInAnswers(answers, service.serviceCode) : answers));
    };
    publish();
    const subscription = form.watch(() => {
      setPhysicalDocumentsConfirmed(false);
      setCoupleAppearanceConfirmed(false);
      setPersonalAppearanceConfirmed(false);
      publish();
    });
    return () => subscription.unsubscribe();
  }, [form, template, service.serviceCode, onAnswersChange, petition]);
  if (!template)
    return (
      <Alert>
        <AlertDescription>
          The registration form is unavailable. Reload the page and try again.
        </AlertDescription>
      </Alert>
    );
  const { definition, answers: caseAnswers } = walkInCaseForService(template.definition, service.serviceCode);
  const textValues = Object.fromEntries(
    Object.entries(watched).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const intakeAnswers = { ...caseAnswers, ...textValues };
  const values = Object.fromEntries(
    Object.entries(deriveTemplateAnswers(definition,
      petition ? petitionWalkInAnswers(intakeAnswers, service.serviceCode) : intakeAnswers,
    )).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const staffDefinition = staffFormDefinition(surnameChangeCaseDefinition(
    petitionDetailsLayout(definition, service.serviceCode, values), service.serviceCode,
  ));
  const displayDefinition = surnameChange ? {
    ...staffDefinition,
    sections: staffDefinition.sections.map(section => ({
      ...section,
      title: section.step === "case" ? "Surname Change Details" : "Child and Parent Information",
    })),
  } : staffDefinition;
  const caseDefinition = {
    ...displayDefinition,
    sections: displayDefinition.sections.map((section) => ({
      ...section,
      fields: section.fields.filter(field => !(petition && service.serviceCode === "RA9048-CCE" && field.key === "primary_petition")).map((field) => {
        if (field.key === "event_date") return { ...field, helpText: undefined };
        if (marriage && field.key === "event_place") return {
          ...field,
          placeholder: "e.g. St. Gregory the Great Cathedral, Legazpi City, Albay",
        };
        return field;
      }),
    })),
  };
  const roles = service.partyRoles;
  const personFields = definition.sections
    .flatMap((section) => section.fields)
    .filter((field) => field.type === "person_group");
  const timing = evaluateTemplateEventTiming(displayDefinition, values);
  const signingInstruction = surnameChange ? surnameChangeSigningInstruction(values.event_date) : null;

  async function submit() {
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
    const subjects = reconcileSubjects(current.subjects, roles).map(person =>
      petition && values.record_type === "marriage" ? { ...person, sex: "male" } : person,
    );
    const answers: TemplateAnswers = {
      ...caseAnswers,
      ...Object.fromEntries(
        Object.entries(current).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
    };
    for (const field of personFields) answers[field.key] = subjects;
    if (petition) Object.assign(answers, petitionWalkInAnswers(answers, service.serviceCode));
    const prepare = supplemental || otherCertificate || (endorsement && values.record_type === "marriage") ? prepareWalkInSupplemental : courtDecree ? prepareWalkInCourtDecree : prepareWalkInBirth;
    const prepared = (petition ? prepareWalkInPetition : prepare)(definition, answers, roles);
    if (prepared.error) {
      setError(staffCopy(prepared.message));
      return;
    }
    setError("");
    await onSubmit({
      serviceCode: service.serviceCode,
      subjects,
      answers,
      templateVersionId: template.versionId,
      physicalDocumentsConfirmed,
      ...(legitimation || marriageLicense ? { coupleAppearanceConfirmed } : {}),
      ...(supplemental || surnameChange ? { personalAppearanceConfirmed } : {}),
    });
  }

  return (
    <fieldset disabled={submitting} className="min-w-0 space-y-6 [&>section]:border-t [&>section]:border-border-light [&>section]:pt-5">
      <DynamicFormFields
        definition={caseDefinition}
        staffView
        step="case"
        showSectionTitles={surnameChange}
        singleColumn={marriage || death || legitimation || courtDecree || supplemental || surnameChange || petition || endorsement}
        control={form.control}
        values={values}
        showRequiredMarks
        onFieldChange={(key, value) =>
          form.setValue(key, value, { shouldValidate: true })
        }
      />
      <DerivedAnswerAlerts definition={displayDefinition} answers={values} compact={marriageLicense} />
      {timing?.evaluation.mismatched ? (
        <EventTimingNotice
          behavior={timing.rule.behavior}
          title={timing.rule.title}
          description={`${timing.rule.description} Choose the matching registration under Service requested above.`}
          ctaLabel=""
        />
      ) : null}
      <DynamicFormFields
        definition={surnameChange ? {
          ...displayDefinition,
          sections: displayDefinition.sections.map(section => ({
            ...section,
            fields: section.fields.filter(field => !["event_date", "event_place"].includes(field.key)),
          })),
        } : displayDefinition}
        staffView
        step="details"
        widePair={petition ? ["event_date", "event_place"] : undefined}
        showSectionTitles={surnameChange}
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
                  {!otherCertificate || values.record_type === "marriage" ? <h3 className={`${FORM_GROUP_CLASS}${index > 0 ? " border-t border-border-light pt-5" : ""}`}>
                    {formatNameHeading(petition ? (values.record_type === "marriage" ? "Husband's Name" : values.record_type === "death" ? "Deceased Person's Name" : "Name on the birth certificate") : otherCertificate ? "Name of Husband" : role.toLowerCase() === "mother"
                      ? "Mother's Maiden Name"
                      : (petition || supplemental || endorsement) && roles.length === 1
                        ? (definition.sections.flatMap((section) => section.fields)
                          .find((field) => field.type === "person_group")?.labelByAnswer?.labels[String(values.record_type ?? "")]
                          ?? "Person named on the record")
                      : surnameChange && role === "Child" ? "Child's name on the birth certificate"
                      : death ? "Name of the deceased"
                      : marriage ? ({ Bride: "Maiden Name of Wife", Groom: "Husband" }[role] ?? role) : role)}
                  </h3> : null}
                  <SubjectFieldGrid
                    control={form.control}
                    setValue={form.setValue}
                    index={index}
                    role={role}
                    hideSex={courtDecree || supplemental || otherCertificate}
                    husband={(otherCertificate || endorsement || petition) && values.record_type === "marriage"}
                    requireMiddleName
                  />
                  {surnameChange && role === "Child" ? (
                    <div className="pt-2">
                      <DynamicFormFields
                        definition={{
                          ...displayDefinition,
                          sections: displayDefinition.sections.map(section => ({
                            ...section,
                            fields: section.fields.filter(field => ["event_date", "event_place"].includes(field.key)),
                          })),
                        }}
                        staffView
                        step="details"
                        hideSectionTitles
                        showRequiredMarks
                        control={form.control}
                        values={values}
                        onFieldChange={(key, value) => form.setValue(key, value, { shouldValidate: true })}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null
        }
      />
      <div className="border-t border-border-light" role="separator" />
      <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <Checkbox className="mt-0.5" checked={physicalDocumentsConfirmed}
          onCheckedChange={(checked) => setPhysicalDocumentsConfirmed(checked === true)} />
        <span>{surnameChange
          ? <>I checked the required birth-record copies and 3 original copies of the Affidavit to Use the Surname of the Father{values.father_on_record === "no" ? ", plus 3 original copies of the notarized Father's Admission of Paternity" : ""}. The papers are complete and acceptable.</>
          : petition
          ? "I checked the physical documents required at filing. They are complete and acceptable for initial processing. Publication documents will be checked at the appropriate later step."
          : endorsement
          ? "I checked the physical documents for the selected endorsement type. The required papers are complete and acceptable."
          : otherCertificate
          ? "I checked the original Application/Verification Form and the agency letter-request. Both are complete and acceptable for processing."
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
        <div className="space-y-3">
        {signingInstruction ? (
          <p className="text-sm leading-relaxed text-body-strong">
            <strong>{signingInstruction.label}:</strong> {signingInstruction.instruction}
          </p>
        ) : null}
        <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <Checkbox className="mt-0.5" checked={personalAppearanceConfirmed}
            onCheckedChange={(checked) => setPersonalAppearanceConfirmed(checked === true)} />
          <span>{surnameChange
            ? "I verified the required personal appearance, signatures, and attestation for the child's age."
            : "The applicant personally appeared."}</span>
        </label>
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
          disabled={submitting || !physicalDocumentsConfirmed || ((legitimation || marriageLicense) && !coupleAppearanceConfirmed) || ((supplemental || surnameChange) && !personalAppearanceConfirmed)}
        >
          {submitting ? "Encoding..." : "Encode request"}
        </Button>
      </div>
    </fieldset>
  );
}
