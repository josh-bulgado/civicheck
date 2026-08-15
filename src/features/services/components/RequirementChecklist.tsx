import { useState } from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { AlertTriangle, Check, ChevronDown, FileText, Info, Upload } from "lucide-react";
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
  allowUploads?: boolean;
}

function isVisible(req: Requirement, selectedCode?: string | null): boolean {
  if (!req.case_tag) return true;
  if (!selectedCode) return false;
  const code = selectedCode.toUpperCase();
  switch (req.case_tag) {
    case "marital_only":
      return code.includes("MARITAL") && !code.includes("NONMARITAL");
    case "non_marital_only":
      return code.includes("NONMARITAL");
    case "brap_only":
      return code.includes("BRAP");
    case "foreigner_only":
      return true;
    default:
      return true;
  }
}

/** Single requirement item — flat row layout */
function RequirementItem({
  req,
  checked,
  onToggle,
  allowUpload,
}: {
  req: Requirement;
  checked: boolean;
  onToggle: () => void;
  allowUpload: boolean;
}) {
  const { primary, secondary } = parseRequirementName(req.requirement_name);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div
      onClick={onToggle}
      className="cursor-pointer select-none rounded-lg px-3 py-3 text-sm transition-colors hover:bg-surface-subtle"
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={req.id}
          checked={!!checked}
          onCheckedChange={onToggle}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-0.5">
        {/* Primary line: document name */}
        <p
          className={`text-xs font-semibold leading-snug ${
            checked
              ? "text-muted-foreground/50 line-through font-normal"
              : "text-foreground"
          }`}
        >
          {primary}
        </p>
        {/* Secondary line: copies / source */}
        {secondary && (
          <p
            className={`text-[11px] leading-snug text-muted-foreground ${
              checked ? "line-through opacity-50" : ""
            }`}
          >
            {secondary}
          </p>
        )}
        {/* where_to_secure from data model */}
        {req.where_to_secure && (
          <p
            className={`text-[11px] leading-snug text-muted-foreground/80 flex items-center gap-1 mt-0.5 ${
              checked ? "opacity-50" : ""
            }`}
          >
            <span className="opacity-60">📍</span> {req.where_to_secure}
          </p>
        )}
        </div>
        {allowUpload && (
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
          >
          <input
            id={`requirement-upload-${req.id}`}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="sr-only"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] ?? null)
            }
          />
          <label
            htmlFor={`requirement-upload-${req.id}`}
            title={selectedFile?.name ?? "Attach a document or photo (optional)"}
            className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong bg-white px-2.5 text-[11px] font-semibold text-foreground shadow-xs transition-colors hover:border-primary/50 hover:text-primary focus-within:ring-2 focus-within:ring-ring"
          >
            {selectedFile ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span>Optional upload</span>
          </label>
          </div>
        )}
      </div>
      {selectedFile && (
        <div className="mt-2 flex min-w-0 items-center gap-1.5 pl-9 text-[11px] font-medium text-muted-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span className="truncate" title={selectedFile.name}>
            {selectedFile.name}
          </span>
        </div>
      )}
    </div>
  );
}

export function RequirementChecklist({
  requirements,
  checkedItems,
  onToggle,
  selectedServiceCode,
  allowUploads = false,
}: RequirementChecklistProps) {
  const visible = requirements.filter((r) => isVisible(r, selectedServiceCode));
  const mandatoryReqs = visible.filter((r) => r.is_mandatory);
  const conditionalReqs = visible.filter((r) => !r.is_mandatory);
  const [conditionalOpen, setConditionalOpen] = useState(false);

  return (
    <Card size="sm">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="font-bold text-base">
          Requirement Checklist{" "}
          {mandatoryReqs.length > 0 && `(${mandatoryReqs.length})`}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Check off each item you have prepared before submitting.
        </p>
        {allowUploads && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <p>
              Document uploads are optional. You can still submit your request
              without attaching any files.
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {visible.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
            No requirements configured for this service.
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
            {/* Mandatory Requirements */}
            {mandatoryReqs.map((req) => (
              <RequirementItem
                key={req.id}
                req={req}
                checked={!!checkedItems[req.id]}
                onToggle={() => onToggle(req.id)}
                allowUpload={allowUploads}
              />
            ))}

            {/* Conditional Requirements */}
            {conditionalReqs.length > 0 && (
              <Collapsible
                open={conditionalOpen}
                onOpenChange={setConditionalOpen}
                className="pt-2"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground border-t border-border mt-2 cursor-pointer select-none group/trigger">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                    If Applicable ({conditionalReqs.length})
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${conditionalOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="divide-y divide-border pt-1">
                  {conditionalReqs.map((req) => (
                    <RequirementItem
                      key={req.id}
                      req={req}
                      checked={!!checkedItems[req.id]}
                      onToggle={() => onToggle(req.id)}
                      allowUpload={allowUploads}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
