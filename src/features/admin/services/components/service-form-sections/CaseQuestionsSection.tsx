import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { CaseFlowBuilder } from "~/features/forms/components/CaseFlowBuilder";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import { EventTimingSection } from "./EventTimingSection";
import type { Service } from "../../services.types";

export function CaseQuestionsSection({
  variants,
  formDefinition,
  publishedFieldKeys,
  targetOptions,
  onFormDefinitionChange,
  embedded = false,
}: {
  variants: Service[];
  formDefinition: FormTemplateDefinition;
  publishedFieldKeys: string[];
  targetOptions: { value: string; label: string }[];
  onFormDefinitionChange: (definition: FormTemplateDefinition) => void;
  embedded?: boolean;
}) {
  return (
    <Card
      id={embedded ? undefined : "case-questions"}
      variant={embedded ? "embedded" : "default"}
      className={embedded ? undefined : "scroll-mt-6"}
    >
      {!embedded ? (
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Users aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle>
                <h2>Timing &amp; Routing</h2>
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      ) : null}
      <CardContent>
        <FieldGroup>
          <EventTimingSection
            id="timing-routing"
            formDefinition={formDefinition}
            targetOptions={targetOptions}
            onFormDefinitionChange={onFormDefinitionChange}
          />

          {variants.length > 1 ? (
            <FieldSet className="gap-4">
              <FieldLegend variant="label" className="mb-0">
                Internal variant routing
              </FieldLegend>
              <FieldDescription>
                Only for services with several internal codes. Applicants see one service, and their answers pick the variant.
              </FieldDescription>
              <CaseFlowBuilder
                definition={formDefinition.caseSelector}
                variants={variants}
                derivedSources={(formDefinition.derivedAnswers ?? []).map(
                  (derived) => ({
                    key: derived.key,
                    label: derived.label,
                    options: derived.bands.map((band) => ({
                      value: band.value,
                      label: band.label,
                    })),
                  }),
                )}
                immutableQuestionKeys={publishedFieldKeys}
                onChange={(caseSelector) =>
                  onFormDefinitionChange({
                    ...formDefinition,
                    caseSelector,
                  })
                }
              />
            </FieldSet>
          ) : null}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
