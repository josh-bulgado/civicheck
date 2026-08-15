import type { FormEvent } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export type AuditFilterValues = {
  actor: string;
  event: string;
  source: "all" | "system" | "request";
  from: string;
  to: string;
};

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
      className="grid gap-3 rounded-xl border border-border bg-surface-subtle p-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      <Input
        aria-label="Filter by actor"
        placeholder="Actor"
        value={values.actor}
        onChange={(event) => update("actor", event.target.value)}
      />
      <Input
        aria-label="Filter by event"
        placeholder="Event"
        value={values.event}
        onChange={(event) => update("event", event.target.value)}
      />
      <select
        aria-label="Filter by source"
        className="h-9 rounded-md border border-input bg-white px-3 text-sm"
        value={values.source}
        onChange={(event) =>
          update(
            "source",
            event.target.value as AuditFilterValues["source"],
          )
        }
      >
        <option value="all">All sources</option>
        <option value="system">System</option>
        <option value="request">Request</option>
      </select>
      <Input
        type="date"
        aria-label="From date"
        value={values.from}
        onChange={(event) => update("from", event.target.value)}
      />
      <Input
        type="date"
        aria-label="To date"
        value={values.to}
        onChange={(event) => update("to", event.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          <Filter />
          Apply
        </Button>
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClear}
            aria-label="Clear audit filters"
          >
            <RotateCcw />
          </Button>
        ) : null}
      </div>
    </form>
  );
}
