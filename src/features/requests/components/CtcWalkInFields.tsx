import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { SubjectFieldGrid, type DetailsValues } from "~/features/apply/components/DetailsStep";
import { ctcDetailsLayout } from "~/features/apply/ctc-layout";
import { DynamicFormFields } from "~/features/forms/components/DynamicFormFields";
import type { TemplateAnswers } from "~/features/forms/form-template.types";
import { canonicalizeTemplateAnswers } from "~/features/forms/form-template.utils";
import { CopiesStepper } from "~/features/services/components/CopiesStepper";
import { emptySubject } from "~/lib/subject-fields";
import type { encodeWalkInFn } from "../walk-in-intake.mutations";
import type { EncodableService } from "../walk-in-intake.queries";
import { ctcWalkInCase, prepareWalkInCtc } from "../walk-in-ctc";

export function CtcWalkInFields({ service, submitting, copies, onCopiesChange, onSubmit, onCancel, onAnswersChange }: {
  service: EncodableService;
  submitting: boolean;
  copies: number;
  onCopiesChange: (copies: number) => void;
  onSubmit: (data: Parameters<typeof encodeWalkInFn>[0]["data"]) => Promise<void>;
  onCancel: () => void;
  onAnswersChange: (answers: TemplateAnswers) => void;
}) {
  const template = service.registrationForm;
  const selected = template ? ctcWalkInCase(template.definition, service.serviceCode) : null;
  const [error, setError] = useState("");
  const form = useForm<DetailsValues>({ defaultValues: {
    ...Object.fromEntries((selected?.definition.sections ?? []).flatMap(section => section.fields)
      .filter(field => field.type !== "person_group").map(field => [field.key, ""])),
    ...selected?.answers,
    subjects: service.partyRoles.map(emptySubject),
  } });
  const watched = useWatch({ control: form.control });
  const values = Object.fromEntries(Object.entries(watched).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  ));
  useEffect(() => {
    if (!template) return;
    const current = ctcWalkInCase(template.definition, service.serviceCode);
    const publish = () => onAnswersChange(canonicalizeTemplateAnswers(current.definition, {
      ...form.getValues(), ...current.answers,
    }));
    publish();
    const subscription = form.watch(publish);
    return () => subscription.unsubscribe();
  }, [form, template, service.serviceCode, onAnswersChange]);

  if (!template || !selected) return <Alert><AlertDescription>The CTC form is unavailable. Reload the page and try again.</AlertDescription></Alert>;
  const { definition } = selected;
  const birth = values.record_type === "birth";
  const marriage = values.record_type === "marriage";
  const detailsDefinition = ctcDetailsLayout(definition, true, values.record_type);
  const displayed = birth ? {
    ...detailsDefinition,
    sections: detailsDefinition.sections.map(section => ({ ...section,
      fields: section.fields.filter(field => !["event_date", "event_place"].includes(field.key)),
    })),
  } : detailsDefinition;
  const recordField = (key: string) => <DynamicFormFields
    definition={{ ...definition, sections: definition.sections.map(section => ({ ...section,
      fields: section.fields.filter(field => field.key === key),
    })) }}
    step="details" staffView singleColumn hideSectionTitles showRequiredMarks
    control={form.control} values={values}
    onFieldChange={(field, value) => form.setValue(field, value, { shouldValidate: true })}
  />;

  async function submit() {
    if (!template || !selected) return;
    const answers = { ...form.getValues(), ...selected.answers };
    const prepared = prepareWalkInCtc(selected.definition, answers, service.partyRoles);
    if (prepared.error) { setError(prepared.message); return; }
    setError("");
    await onSubmit({ serviceCode: service.serviceCode, subjects: prepared.subjects, answers,
      templateVersionId: template.versionId, copies });
  }

  return <fieldset disabled={submitting} className="min-w-0 space-y-6">
    <DynamicFormFields definition={definition} step="case" staffView hideSectionTitles showRequiredMarks
      control={form.control} values={values}
      onFieldChange={(key, value) => form.setValue(key, value, { shouldValidate: true })} />
    {service.feePerCopy ? <CopiesStepper value={copies} onChange={onCopiesChange} unitFee={service.fee} /> : null}
    <DynamicFormFields definition={displayed} step="details" staffView showSectionTitles showRequiredMarks
      control={form.control} values={values}
      onFieldChange={(key, value) => form.setValue(key, value, { shouldValidate: true })}
      renderSectionLead={section => section.fields.some(field => field.type === "person_group") ? <>
        {service.partyRoles.map((role, index) => <SubjectFieldGrid key={role} control={form.control}
          setValue={form.setValue} index={index} role={role} husband={marriage} requireMiddleName>
          {birth ? recordField("event_date") : null}
        </SubjectFieldGrid>)}
        {birth ? <div className="pt-3">{recordField("event_place")}</div> : null}
      </> : null}
    />
    {error ? <Alert role="alert" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <div className="flex justify-end gap-3">
      <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      <Button type="button" disabled={submitting} onClick={() => void form.handleSubmit(submit)()}>
        {submitting ? "Encoding..." : "Encode request"}
      </Button>
    </div>
  </fieldset>;
}
