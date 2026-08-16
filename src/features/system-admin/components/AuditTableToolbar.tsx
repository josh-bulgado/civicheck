import type { FormEvent } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export type AuditFilterValues = {
  actor: string;
  event: string;
  source: "all" | "system" | "request";
  from: string;
  to: string;
};

const sourceOptions: {
  value: AuditFilterValues["source"];
  label: string;
}[] = [
  { value: "all", label: "All Sources" },
  { value: "system", label: "System" },
  { value: "request", label: "Request" },
];

export function AuditTableToolbar({
  values,
  onChange,
  onApply,
  onClear,
}: {
  values: AuditFilterValues;
  onChange: (values: AuditFilterValues) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  function update<Key extends keyof AuditFilterValues>(
    key: Key,
    value: AuditFilterValues[Key],
  ) {
    onChange({ ...values, [key]: value });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply();
  }

  const hasFilters = Object.entries(values).some(
    ([key, value]) => (key === "source" ? value !== "all" : value !== ""),
  );

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Audit event filters"
    >
      <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Field>
          <FieldLabel htmlFor="audit-filter-actor">Actor</FieldLabel>
          <Input
            id="audit-filter-actor"
            name="actor"
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g., admin@example.com…"
            value={values.actor}
            onChange={(event) => update("actor", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-filter-event">Event</FieldLabel>
          <Input
            id="audit-filter-event"
            name="event"
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g., account.updated…"
            value={values.event}
            onChange={(event) => update("event", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-filter-source">Source</FieldLabel>
          <Select
            name="source"
            value={values.source}
            onValueChange={(value) =>
              update("source", value as AuditFilterValues["source"])
            }
          >
            <SelectTrigger id="audit-filter-source" className="w-full">
              <SelectValue>
                {(value) =>
                  sourceOptions.find((option) => option.value === value)?.label
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {sourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-filter-from">From Date</FieldLabel>
          <Input
            id="audit-filter-from"
            name="from"
            type="date"
            autoComplete="off"
            value={values.from}
            onChange={(event) => update("from", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-filter-to">To Date</FieldLabel>
          <Input
            id="audit-filter-to"
            name="to"
            type="date"
            autoComplete="off"
            value={values.to}
            onChange={(event) => update("to", event.target.value)}
          />
        </Field>
        <Field orientation="horizontal" className="self-end">
          <Button type="submit" className="flex-1">
            <Filter data-icon="inline-start" aria-hidden="true" />
            Apply Filters
          </Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onClear}
              aria-label="Clear audit filters"
            >
              <RotateCcw aria-hidden="true" />
            </Button>
          ) : null}
        </Field>
      </FieldGroup>
    </form>
  );
}
