import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { FormTemplateBuilder } from "~/features/forms/components/FormTemplateBuilder";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";

interface ApplicationFormSectionProps {
  templateName: string;
  templateVersion: number;
  templateSharedCodes: string[];
  publishedFieldKeys: string[];
  formDefinition: FormTemplateDefinition;
  isLoading: boolean;
  onTemplateNameChange: (name: string) => void;
  onFormDefinitionChange: (definition: FormTemplateDefinition) => void;
}

export function ApplicationFormSection({
  templateName,
  templateVersion,
  templateSharedCodes,
  publishedFieldKeys,
  formDefinition,
  isLoading,
  onTemplateNameChange,
  onFormDefinitionChange,
}: ApplicationFormSectionProps) {
  return (
    <Card id="application-form" className="scroll-mt-6">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <ClipboardCheck aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>
              <h2>Dynamic Application Questions</h2>
            </CardTitle>
            <CardDescription>
              Add applicant questions and use conditional visibility to reveal
              follow-up questions from selected answers. Saving publishes an
              immutable database version
              {templateVersion > 0 ? ` after version ${templateVersion}` : ""}.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="service-form-template-name">
            Template Name
          </FieldLabel>
          <Input
            id="service-form-template-name"
            name="template_name"
            value={templateName}
            onChange={(event) => onTemplateNameChange(event.target.value)}
            placeholder="Birth registration application…"
            autoComplete="off"
          />
          <FieldDescription>
            A reusable administrative name. It is not shown as a question to
            applicants.
          </FieldDescription>
        </Field>

        {templateSharedCodes.length > 1 ? (
          <Alert variant="warning">
            <AlertTriangle aria-hidden="true" />
            <AlertDescription>
              This form template is shared by {templateSharedCodes.length}{" "}
              service variants: {templateSharedCodes.join(", ")}. Publishing
              changes the active form for all of them.
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Spinner />
            Loading application form&hellip;
          </div>
        ) : (
          <FormTemplateBuilder
            definition={formDefinition}
            onChange={onFormDefinitionChange}
            immutableKeys={publishedFieldKeys}
          />
        )}
      </CardContent>
    </Card>
  );
}
