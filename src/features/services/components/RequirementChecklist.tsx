import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";

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

export function RequirementChecklist({
  requirements,
  checkedItems,
  onToggle,
  selectedServiceCode,
}: RequirementChecklistProps) {
  const visible = requirements.filter((r) => isVisible(r, selectedServiceCode));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-gray-900">Requirement Checklist</h2>
        <p className="text-xs text-muted-foreground">
          Check off each item you have prepared before submitting.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        {visible.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg text-gray-500 text-sm">
            No requirements configured for this service.
          </div>
        ) : (
          visible.map((req) => (
            <div
              key={req.id}
              onClick={() => onToggle(req.id)}
              className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                checkedItems[req.id]
                  ? "bg-slate-50 border-gray-300"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Checkbox
                id={req.id}
                checked={!!checkedItems[req.id]}
                onCheckedChange={() => onToggle(req.id)}
                className="mt-0.5 shrink-0"
              />
              <div className="space-y-1 flex-1">
                <p
                  className={`leading-relaxed ${
                    checkedItems[req.id]
                      ? "text-gray-500 line-through"
                      : "text-gray-900 font-medium"
                  }`}
                >
                  {req.requirement_name}
                </p>
                {req.where_to_secure && (
                  <p className="text-xs text-gray-400">📍 {req.where_to_secure}</p>
                )}
                <div>
                  {req.is_mandatory ? (
                    <Badge variant="destructive" className="text-2xs px-1.5 py-0.5">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-2xs px-1.5 py-0.5">
                      If applicable
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
