import { MapPin } from "lucide-react";
import type { TemplateAnswers } from "~/features/forms/form-template.types";
import { conditionRuleMatches } from "~/features/forms/form-template.utils";
import { surnameChangeRequirementName, surnameChangeRequirementDisplay } from "~/features/services/surname-change";
import { describeRequirement, requirementDisplayName, ON_TIME_BIRTH_COLB_TITLE } from "~/features/services/requirement-display";
import { endorsementRequirementName } from "~/features/services/electronic-endorsement";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import {
  CASE_TAG_LABELS,
  parseRequirementName,
} from "~/features/services/service-utils";

/** One checklist row — document name, where to secure it, and who it applies to. */
export function RequirementRow({
  requirement,
  tone,
  answers,
}: {
  requirement: ServiceRequirement;
  tone: "required" | "conditional";
  answers?: TemplateAnswers;
}) {
  const display = surnameChangeRequirementDisplay(surnameChangeRequirementName(
    requirement.requirement_name,
    requirement.service_code ?? requirement.requirement_group,
    answers?.event_date,
  ), requirement.service_code ?? requirement.requirement_group);
  const name = requirementDisplayName(display.name);
  const parsed = parseRequirementName(endorsementRequirementName(
    name, requirement.service_code ?? requirement.requirement_group,
    typeof answers?.record_type === "string" ? answers.record_type : undefined,
  ));
  const described = display.ageNote ? describeRequirement(name) : null;
  const onTimeBirth = requirement.requirement_group === "birth_ontime" ||
    requirement.service_code === "BIRTH_ONTIME" || requirement.service_code?.startsWith("OTCOLB-");
  const primary = onTimeBirth && /certificate of live birth/i.test(name)
    ? ON_TIME_BIRTH_COLB_TITLE : described?.title ?? parsed.primary;
  const secondary = described?.detail ?? parsed.secondary;
  const source = requirement.where_to_secure;
  const caseTag = requirement.applies_when
    ? answers && conditionRuleMatches(requirement.applies_when, answers)
      ? "Applies to this request"
      : "Depends on case answers"
    : requirement.case_tag
      ? (CASE_TAG_LABELS[requirement.case_tag] ?? null)
      : null;

  return (
    <li className="flex flex-col gap-1 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-sm font-semibold leading-snug text-body-strong">
          {primary}
        </p>
        {caseTag && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
            {caseTag}
          </span>
        )}
      </div>
      {secondary && (
        <p className="text-xs leading-snug text-body-strong">{secondary}</p>
      )}
      {display.ageNote ? (
        <p className="text-sm leading-snug text-body-strong">
          <strong>{display.ageLabel}:</strong> {display.ageNote}
        </p>
      ) : null}
      {source && (
        <p
          className={`flex items-start gap-1.5 text-xs leading-snug ${
            tone === "conditional" ? "text-warning-strong" : "text-muted-foreground"
          }`}
        >
          <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {source}
        </p>
      )}
    </li>
  );
}
