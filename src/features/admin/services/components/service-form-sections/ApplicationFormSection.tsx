import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { FormTemplateBuilder } from "~/features/forms/components/FormTemplateBuilder";
import type { ConditionRef } from "~/features/forms/form-option-usage";
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
  embedded?: boolean;
  /** Requirement conditions that point at dropdown options in this form. */
  externalConditions?: readonly ConditionRef[];
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
  embedded = false,
  externalConditions,
}: ApplicationFormSectionProps) {
  return (
    <Card
      id={embedded ? undefined : "application-form"}
      variant={embedded ? "embedded" : "default"}
      // Embedded, -mt-6 cancels the section card's top padding so the Template
      // Name sits right under the header. It sits on this card because the card
      // clips overflow.
      className={embedded ? "-mt-6" : "scroll-mt-6"}
    >
      {!embedded ? (
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <ClipboardCheck aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle>
                <h2>Application Form</h2>
              </CardTitle>
              <CardDescription>
                Add the questions applicants answer, and show follow-up questions based on earlier answers. Each save publishes a new version, and published versions can’t be edited
                {templateVersion > 0 ? ` after version ${templateVersion}` : ""}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      ) : null}
      <CardContent className="flex flex-col">
        <div className="flex flex-col gap-4 pb-6">
          <Field>
            <FieldLabel htmlFor="service-form-template-name" data-compact>
              Template Name
            </FieldLabel>
            <Input
              id="service-form-template-name"
              name="template_name"
              fieldSize="touch"
              value={templateName}
              onChange={(event) => onTemplateNameChange(event.target.value)}
              placeholder="Birth registration application…"
              autoComplete="off"
            />
            <FieldDescription>
              For staff only. Applicants don’t see this name.
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
        </div>

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
            externalConditions={externalConditions}
            edgeToEdge
            version={templateVersion}
          />
        )}
      </CardContent>
    </Card>
  );
}
