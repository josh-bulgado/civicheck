import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { FormOption } from "../form-template.types";
import { ADD_PILL } from "./ConditionRuleBuilder";

const ROW = "grid grid-cols-[1fr_1fr_44px] gap-2";

interface OptionRowsEditorProps {
  /** Prefix for the ids that tie a row to its "Used by" note. */
  idPrefix: string;
  /** What a row is called in labels read aloud, such as "Option" or "Choice". */
  noun?: string;
  options: readonly FormOption[];
  /**
   * What relies on a row's value. A row that is used keeps its stored value
   * and cannot be removed; leave this off where renames are carried through.
   */
  usageFor?: (index: number) => readonly string[];
  /** Rows at or below this count cannot be removed. */
  minOptions?: number;
  addLabel?: string;
  onValueChange: (index: number, value: string) => void;
  onLabelChange: (index: number, label: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

/**
 * The Value | Label rows for a list of choices, shared by the form field sheet's
 * dropdown options and the routing questions' choices. The stored value comes
 * first, since conditions use it, and the label is what applicants see.
 */
export function OptionRowsEditor({
  idPrefix,
  noun = "Option",
  options,
  usageFor,
  minOptions = 0,
  addLabel = "Add Option",
  onValueChange,
  onLabelChange,
  onRemove,
  onAdd,
}: OptionRowsEditorProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {options.length > 0 ? (
        <div
          className={cn(
            ROW,
            "text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase",
          )}
        >
          <span>Value</span>
          <span>Label</span>
          <span />
        </div>
      ) : null}
      {options.map((option, index) => {
        const usage = usageFor?.(index) ?? [];
        const inUse = usage.length > 0;
        const usageId = `${idPrefix}-${index}-usage`;
        return (
          <div key={index} className="flex flex-col gap-1">
            <div className={cn(ROW, "items-center")}>
              <Input
                value={option.value}
                readOnly={inUse}
                aria-readonly={inUse || undefined}
                autoComplete="off"
                spellCheck={false}
                title={
                  inUse
                    ? "Used by a condition, so its value can’t change."
                    : undefined
                }
                fieldSize="touch"
                className={cn(
                  "font-mono text-sm",
                  inUse && "bg-muted/60 text-muted-foreground",
                )}
                aria-label={`${noun} ${index + 1} value`}
                aria-describedby={inUse ? usageId : undefined}
                onChange={(event) => onValueChange(index, event.target.value)}
              />
              <Input
                value={option.label}
                autoComplete="off"
                fieldSize="touch"
                className="text-[15px]"
                aria-label={`${noun} ${index + 1} label`}
                onChange={(event) => onLabelChange(index, event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                disabled={inUse || options.length <= minOptions}
                className="size-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${noun.toLowerCase()} ${index + 1}`}
                aria-describedby={inUse ? usageId : undefined}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            {inUse ? (
              <p id={usageId} className="text-[13px] text-muted-foreground">
                Used by: {usage.join("; ")}. It can’t be removed or re-keyed.
              </p>
            ) : null}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        className={ADD_PILL}
        onClick={onAdd}
      >
        <Plus aria-hidden="true" data-icon="inline-start" />
        {addLabel}
      </Button>
    </div>
  );
}
