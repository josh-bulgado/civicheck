import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { FieldGroup } from "~/components/ui/field";
import { SettingGroup } from "~/components/ui/setting-group";
import { CaseFlowBuilder } from "~/features/forms/components/CaseFlowBuilder";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import { EventTimingSection } from "./EventTimingSection";
import { RemoveWindowRuleButton } from "./RemoveWindowRuleButton";
import type { Service } from "../../services.types";

/** The section description; grouped services also pick a variant here. */
export function timingRoutingDescription(hasVariants: boolean) {
  return hasVariants
    ? "Which internal variant an applicant lands on, and what happens when their event date falls outside the on-time window."
    : "Send applicants to the right track when their event date falls outside the on-time window.";
}

/**
 * Timing & Routing, shared by the service editor and the group's shared
 * application editor: variant routing first (only for services with several
 * internal codes), then the optional registration window rule.
 */
export function CaseQuestionsSection({
  variants,
  formDefinition,
  publishedFieldKeys,
  targetOptions,
  currentServiceCode,
  onFormDefinitionChange,
  embedded = false,
}: {
  variants: Service[];
  formDefinition: FormTemplateDefinition;
  publishedFieldKeys: string[];
  targetOptions: { value: string; label: string }[];
  /** The `targetOptions` value for the service being edited, if it is saved. */
  currentServiceCode?: string | null;
  onFormDefinitionChange: (definition: FormTemplateDefinition) => void;
  embedded?: boolean;
}) {
  return (
    <Card
      id={embedded ? undefined : "case-questions"}
      variant={embedded ? "embedded" : "default"}
      // Embedded, -mt-6 cancels the section card's top padding so the first band
      // meets the header. It sits on this card because the card clips overflow.
      className={embedded ? "-mt-6" : "scroll-mt-6"}
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
        <FieldGroup className="gap-0">
          {variants.length > 1 ? (
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
          ) : null}

          <SettingGroup
            title="Registration window"
            aside={
              formDefinition.eventTiming ? (
                <RemoveWindowRuleButton
                  onRemove={() =>
                    onFormDefinitionChange({
                      ...formDefinition,
                      eventTiming: undefined,
                    })
                  }
                />
              ) : (
                "Optional"
              )
            }
            padded
          >
            <EventTimingSection
              id="timing-routing"
              formDefinition={formDefinition}
              targetOptions={targetOptions}
              currentServiceCode={currentServiceCode}
              onFormDefinitionChange={onFormDefinitionChange}
            />
          </SettingGroup>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
