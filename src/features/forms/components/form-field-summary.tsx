import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type {
  FormFieldDefinition,
  FormStep,
  FormTemplateDefinition,
} from "../form-template.types";
import { fieldTypeLabel } from "./form-field-types";

export function fieldsInStep(definition: FormTemplateDefinition, step: FormStep) {
  return definition.sections
    .filter((section) => section.step === step)
    .flatMap((section) => section.fields);
}

export function describeVisibility(
  field: FormFieldDefinition,
  fields: FormFieldDefinition[],
  index: number,
) {
  if (!field.visibleWhen) return null;
  const { field: sourceKey, operator, value } = field.visibleWhen;
  const sourceIndex = fields.findIndex((candidate) => candidate.key === sourceKey);
  const source = fields[sourceIndex];
  const answer =
    source?.options?.find((option) => option.value === value)?.label ?? value;

  return {
    text: `${source?.label ?? sourceKey} ${operator === "equals" ? "is" : "is not"} ${answer}`,
    misordered: sourceIndex > index,
  };
}

// Sizes are explicit: the preview sheet portals out of the editor, so the
// editor's badge sizing does not reach it.
const CHIP = "h-6 px-2.5 text-[12.5px] font-semibold";

export function FieldTypeChip({ type }: { type: FormFieldDefinition["type"] }) {
  return (
    <Badge variant="neutral" className={cn(CHIP, "text-body")}>
      {fieldTypeLabel(type)}
    </Badge>
  );
}

export function FieldRequiredChip({ required }: { required: boolean }) {
  return required ? (
    <Badge className={cn(CHIP, "gap-1.5 bg-primary-soft text-primary")}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      Required
    </Badge>
  ) : (
    <span className="text-[13px] text-muted-foreground">Optional</span>
  );
}
