import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import { RequirementRow } from "~/features/services/components/RequirementRow";
import { cn } from "~/lib/utils";

// The three blocks of a service's checklist, shared by the requirements dialog
// and the staff service reference so both read the same way.

/** The checklist could not be loaded; offers another try. */
export function ChecklistLoadError({
  error,
  retry,
  className,
}: {
  error: string;
  retry: () => void;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertTitle>Unable to load requirements</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
      <Button type="button" variant="outline" size="sm" onClick={retry}>
        Try again
      </Button>
    </Alert>
  );
}

/** The documents a visitor must bring. */
export function RequiredDocuments({
  requirements,
  heading = "Documents to bring",
}: {
  requirements: ServiceRequirement[];
  heading?: string;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-sm font-bold text-foreground">
        {heading} ({requirements.length})
      </h3>
      {requirements.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-dashed-border bg-background p-3.5 text-xs italic text-muted-foreground">
          No required documents are listed for this service.
        </p>
      ) : (
        <ul className="divide-y divide-border-lighter rounded-[10px] border border-border-light">
          {requirements.map((req) => (
            <RequirementRow key={req.id} requirement={req} tone="required" />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Documents asked for only in some situations, folded away until opened. */
export function ConditionalDocuments({
  requirements,
}: {
  requirements: ServiceRequirement[];
}) {
  const [open, setOpen] = useState(false);
  if (requirements.length === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="flex flex-col gap-2.5"
    >
      <CollapsibleTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-between px-0 text-left whitespace-normal"
          />
        }
      >
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <AlertTriangle className="size-3.5 text-warning" aria-hidden="true" />
          Only if it applies ({requirements.length})
        </h3>
        <ChevronDown
          data-icon="inline-end"
          className={cn("transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="divide-y divide-warning-border/40 rounded-[10px] border border-warning-border bg-warning-soft">
          {requirements.map((req) => (
            <RequirementRow key={req.id} requirement={req} tone="conditional" />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** What happens at the office, in order. Renders nothing for an empty list. */
export function OfficeSteps({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-foreground">
        What happens at the office
      </h3>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
              {index + 1}
            </span>
            <p className="pt-0.5 text-sm leading-relaxed text-body-strong">
              {step}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
