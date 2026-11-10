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
import { birthCaseForService, prepareWalkInBirth } from "../walk-in-birth";

export function WalkInBirthFields({
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
  }) => Promise<void>;
  onCancel: () => void;
  onAnswersChange: (answers: TemplateAnswers) => void;
}) {
  const [error, setError] = useState("");
  const [physicalDocumentsConfirmed, setPhysicalDocumentsConfirmed] = useState(false);
  const form = useForm<DetailsValues>({
    defaultValues: {
      ...Object.fromEntries((service.birthForm?.definition.sections ?? [])
        .flatMap((section) => section.fields)
        .filter((field) => field.type !== "person_group")
        .map((field) => [field.key, ""])),
      subjects: service.partyRoles.map(emptySubject),
    },
  });
  const template = service.birthForm;
  useEffect(() => {
    if (!template) return;
    const selectedCase = birthCaseForService(template.definition, service.serviceCode);
    const publish = () => {
      const text = Object.fromEntries(Object.entries(form.getValues()).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ));
      onAnswersChange(canonicalizeTemplateAnswers(selectedCase.definition, { ...selectedCase.answers, ...text }));
    };
    publish();
    const subscription = form.watch(() => {
      setPhysicalDocumentsConfirmed(false);
      publish();
    });
    return () => subscription.unsubscribe();
  }, [form, template, service.serviceCode, onAnswersChange]);
  if (!template)
    return (
      <Alert>
        <AlertDescription>
          The birth form is unavailable. Reload the page and try again.
        </AlertDescription>
      </Alert>
    );
  const { definition, answers: caseAnswers } = birthCaseForService(template.definition, service.serviceCode);
  const caseDefinition = {
    ...definition,
    sections: definition.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => field.key === "event_date" ? { ...field, helpText: undefined } : field),
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
    const prepared = prepareWalkInBirth(definition, answers, roles);
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
    });
  }

  return (
    <fieldset disabled={submitting} className="min-w-0 space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter the visitor's birth registration details. Check the applicant’s physical documents.
      </p>
      <DynamicFormFields
        definition={caseDefinition}
        step="case"
        control={form.control}
        values={values}
        showRequiredMarks
        onFieldChange={(key, value) =>
          form.setValue(key, value, { shouldValidate: true })
        }
      />
      <DerivedAnswerAlerts definition={definition} answers={values} />
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
                      : role}
                  </h3>
                  <SubjectFieldGrid
                    control={form.control}
                    setValue={form.setValue}
                    index={index}
                    role={role}
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
        <span>I checked the physical documents. The required papers are complete and acceptable.</span>
      </label>
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
          disabled={submitting || !physicalDocumentsConfirmed}
        >
          {submitting ? "Encoding..." : "Encode request"}
        </Button>
      </div>
    </fieldset>
  );
}
