import { Button } from "~/components/ui/button";
import { Sheet, SheetClose, SheetContent } from "~/components/ui/sheet";
import type { FormStep, FormTemplateDefinition } from "../form-template.types";
import { EDITOR_SHEET_PROPS, EditorSheetHeader } from "./EditorSheetParts";
import {
  FieldRequiredChip,
  FieldTypeChip,
  describeVisibility,
  fieldsInStep,
} from "./form-field-summary";

/** What applicants will answer, in order, one list per step. */
export function PublishedFormPreviewSheet({
  open,
  onOpenChange,
  definition,
  steps,
  version,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: FormTemplateDefinition;
  steps: Array<{ value: FormStep; label: string }>;
  /** The live version, or 0 when nothing is published yet. */
  version: number;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        {...EDITOR_SHEET_PROPS}
        showCloseButton={false}
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-[600px]"
      >
        <EditorSheetHeader
          title="Published Form Structure"
          description={`${version > 0 ? `Version ${version}` : "Not published yet"} · what applicants answer, in order`}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
          {steps.map((step) => {
            const fields = fieldsInStep(definition, step.value);
            return (
              <section key={step.value} className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold tracking-tight">
                  {step.label}
                </h4>
                <ol className="flex flex-col gap-1.5">
                  {fields.map((field, index) => {
                    const visibility = describeVisibility(field, fields, index);
                    return (
                      <li
                        key={field.key}
                        className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl bg-surface-subtle px-3 py-2.5 text-sm ring-1 ring-border ring-inset"
                      >
                        <b className="font-semibold">{field.label}</b>
                        <FieldTypeChip type={field.type} />
                        <FieldRequiredChip required={field.required} />
                        <span className="text-[13px] text-muted-foreground">
                          {visibility
                            ? `Shown when ${visibility.text}`
                            : "Always shown"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <SheetClose
            render={<Button type="button" variant="raised" size="lg" />}
          >
            Done
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
