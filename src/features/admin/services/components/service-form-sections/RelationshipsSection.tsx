import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ChevronDown, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { ServiceFormValues } from "../service-form.config";

export function RelationshipsSection() {
  const [isOpen, setIsOpen] = useState(false);
  const form = useFormContext<ServiceFormValues>();

  return (
    <Card id="relationships" className="scroll-mt-6">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Settings2 aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>
              <h2>Relationships</h2>
            </CardTitle>
            <CardDescription>
              Optional grouping for variants that share a public card or
              checklist.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex w-full cursor-pointer select-none items-center justify-between rounded-md border border-border bg-surface-subtle px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            {isOpen ? "Hide Relationship Fields" : "Configure Relationships"}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 transition-transform duration-200 motion-reduce:transition-none",
                isOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-4 pt-4">
            <p className="text-xs text-muted-foreground">
              Only needed when this service is one variant of a service
              applicants browse as a single card (e.g. on-time and delayed
              birth registration). Leave blank for a standalone service — its
              checklist is then keyed to its own service code.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="display_group"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="service-display-group">
                      Display Group
                    </FieldLabel>
                    <Input
                      {...field}
                      id="service-display-group"
                      placeholder="birth_ontime…"
                      className="font-mono"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="service-display-name">
                      Display Name
                    </FieldLabel>
                    <Input
                      {...field}
                      id="service-display-name"
                      placeholder="Birth Certificate…"
                      autoComplete="off"
                    />
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="requirement_group"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="service-requirement-group">
                    Requirement Group
                  </FieldLabel>
                  <Input
                    {...field}
                    id="service-requirement-group"
                    placeholder="birth_ontime…"
                    className="font-mono"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <FieldDescription>
                    Set this to share one checklist across several service
                    variants.
                  </FieldDescription>
                </Field>
              )}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
