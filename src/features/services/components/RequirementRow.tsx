import { MapPin } from "lucide-react";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import {
  CASE_TAG_LABELS,
  parseRequirementName,
  splitCaseLabel,
} from "~/features/services/service-utils";

/** One checklist row — document name, where to secure it, and who it applies to. */
export function RequirementRow({
  requirement,
  tone,
}: {
  requirement: ServiceRequirement;
  tone: "required" | "conditional";
}) {
  const { caseLabel, name } = splitCaseLabel(requirement.requirement_name);
  const { primary, secondary } = parseRequirementName(name);
  const source = requirement.where_to_secure ?? secondary;
  const caseTag = requirement.applies_when
    ? "Depends on case answers"
    : requirement.case_tag
      ? (CASE_TAG_LABELS[requirement.case_tag] ?? null)
      : null;

  return (
    <li className="flex flex-col gap-1 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-sm font-semibold leading-snug text-body-strong">
          {primary}
        </p>
        {(caseLabel || caseTag) && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
            {caseLabel ?? caseTag}
          </span>
        )}
      </div>
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
