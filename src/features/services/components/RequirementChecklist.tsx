import { useState } from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import { parseRequirementName } from "~/features/services/service-utils";

interface Requirement {
  id: string;
  requirement_name: string;
  is_mandatory: boolean;
  where_to_secure?: string | null;
  case_tag?: string | null;
}

interface RequirementChecklistProps {
  requirements: Requirement[];
  checkedItems: Record<string, boolean>;
  onToggle: (id: string) => void;
  selectedServiceCode?: string | null;
}

function isVisible(req: Requirement, selectedCode?: string | null): boolean {
  if (!req.case_tag) return true;
  if (!selectedCode) return false;
  const code = selectedCode.toUpperCase();
  switch (req.case_tag) {
    case "marital_only":     return code.includes("MARITAL") && !code.includes("NONMARITAL");
    case "non_marital_only": return code.includes("NONMARITAL");
    case "brap_only":        return code.includes("BRAP");
    case "foreigner_only":   return true;
    default:                 return true;
  }
}

/** Single requirement item — two-line layout */
function RequirementItem({
  req,
  checked,
  onToggle,
  accentColor,
  borderColor,
}: {
  req: Requirement;
  checked: boolean;
  onToggle: () => void;
  accentColor: string;
  borderColor: string;
}) {
  const { primary, secondary } = parseRequirementName(req.requirement_name);

  return (
    <div
      onClick={onToggle}
      className={`flex items-start gap-3 p-3.5 rounded-lg border-l-[3px] border text-sm cursor-pointer transition-all duration-150 ${
        checked
          ? "bg-gray-50/80 border-gray-200"
          : "bg-white hover:bg-gray-50/50 border-gray-200"
      }`}
      style={{ borderLeftColor: checked ? "var(--svc-text-muted)" : borderColor }}
    >
      <Checkbox
        id={req.id}
        checked={!!checked}
        onCheckedChange={onToggle}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-0.5">
        {/* Primary line: document name */}
        <p
          className={`text-[13px] leading-snug ${
            checked
              ? "text-gray-400 line-through"
              : "font-semibold"
          }`}
          style={{ color: checked ? undefined : "var(--svc-text-primary)" }}
        >
          {primary}
        </p>
        {/* Secondary line: copies / source */}
        {secondary && (
          <p
            className={`text-[11px] leading-snug ${checked ? "line-through" : ""}`}
            style={{ color: "var(--svc-text-secondary)" }}
          >
            {secondary}
          </p>
        )}
        {/* where_to_secure from data model (if present and different from parsed secondary) */}
        {req.where_to_secure && (
          <p className="text-[11px] leading-snug" style={{ color: "var(--svc-text-muted)" }}>
            📍 {req.where_to_secure}
          </p>
        )}
      </div>
    </div>
  );
}

export function RequirementChecklist({
  requirements,
  checkedItems,
  onToggle,
  selectedServiceCode,
}: RequirementChecklistProps) {
  const visible = requirements.filter((r) => isVisible(r, selectedServiceCode));
  const mandatoryReqs = visible.filter((r) => r.is_mandatory);
  const conditionalReqs = visible.filter((r) => !r.is_mandatory);

  const [conditionalOpen, setConditionalOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold" style={{ color: "var(--svc-text-primary)" }}>
          Requirement Checklist
        </h2>
        <p className="text-xs" style={{ color: "var(--svc-text-secondary)" }}>
          Check off each item you have prepared before submitting.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg text-sm" style={{ color: "var(--svc-text-secondary)" }}>
          No requirements configured for this service.
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Mandatory Requirements ──────────────────────────────────── */}
          {mandatoryReqs.length > 0 && (
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-md w-fit text-xs font-bold"
                style={{
                  background: "var(--svc-primary-soft)",
                  color: "var(--svc-primary)",
                  border: "1px solid var(--svc-primary-border)",
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Required Documents ({mandatoryReqs.length})
              </div>
              <div className="space-y-2">
                {mandatoryReqs.map((req) => (
                  <RequirementItem
                    key={req.id}
                    req={req}
                    checked={!!checkedItems[req.id]}
                    onToggle={() => onToggle(req.id)}
                    accentColor="var(--svc-primary)"
                    borderColor="var(--svc-primary-border)"
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Conditional Requirements (collapsed by default) ────────── */}
          {conditionalReqs.length > 0 && (
            <Collapsible open={conditionalOpen} onOpenChange={setConditionalOpen}>
              <CollapsibleTrigger
                className="flex items-center justify-between w-full gap-2 px-3 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors hover:opacity-90"
                style={{
                  background: "var(--svc-caution-soft)",
                  color: "var(--svc-caution)",
                  border: "1px solid var(--svc-caution-border)",
                }}
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  If Applicable ({conditionalReqs.length})
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    conditionalOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>

              {/* Collapsed hint */}
              {!conditionalOpen && (
                <p className="text-[11px] mt-1.5 pl-1" style={{ color: "var(--svc-text-muted)" }}>
                  These may apply depending on your specific case. Tap to expand.
                </p>
              )}

              <CollapsibleContent className="space-y-2 pt-3">
                {conditionalReqs.map((req) => (
                  <RequirementItem
                    key={req.id}
                    req={req}
                    checked={!!checkedItems[req.id]}
                    onToggle={() => onToggle(req.id)}
                    accentColor="var(--svc-caution)"
                    borderColor="var(--svc-caution-border)"
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
