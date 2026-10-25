import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, ChevronDown, Search, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export type AuditFilterValues = {
  q: string;
  actor: string;
  event: string;
  source: "all" | "system" | "request" | "sign-in";
  from: string;
  to: string;
};

const sourceOptions = [
  { value: "all", label: "All sources" },
  { value: "system", label: "System" },
  { value: "request", label: "Request" },
  { value: "sign-in", label: "Sign-In" },
];

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AuditTableToolbar({
  values,
  onApply,
}: {
  values: AuditFilterValues;
  onApply: (values: AuditFilterValues) => void;
}) {
  const [query, setQuery] = useState(values.q);
  const [previousQuery, setPreviousQuery] = useState(values.q);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [from, setFrom] = useState(values.from);
  const [to, setTo] = useState(values.to);

  // External navigation updates the input; our own response keeps any newer typing.
  if (previousQuery !== values.q) {
    setPreviousQuery(values.q);
    if (values.q !== submittedQuery) setQuery(values.q);
  }

  const apply = useCallback(
    (next: AuditFilterValues) => {
      setSubmittedQuery(next.q.trim());
      onApply(next);
    },
    [onApply],
  );

  useEffect(() => {
    if (query.trim() === values.q || query.trim() === submittedQuery) return;
    const timeout = window.setTimeout(
      () => apply({ ...values, q: query }),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [query, values, submittedQuery, apply]);

  const hasFilters =
    query ||
    values.actor ||
    values.event ||
    values.source !== "all" ||
    values.from ||
    values.to;
  const dateLabel =
    values.from && values.to
      ? `${shortDate(values.from)} – ${shortDate(values.to)}`
      : values.from
        ? `From ${shortDate(values.from)}`
        : values.to
          ? `Until ${shortDate(values.to)}`
          : "Any date";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply({ ...values, q: query });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Audit event filters"
      className="audit-toolbar"
    >
      <div className="relative w-full sm:w-80 lg:w-96">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Search actor or event"
          name="q"
          type="search"
          autoComplete="off"
          spellCheck={false}
          maxLength={100}
          placeholder="Search actor or event"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="rounded-xl border-border pl-9 shadow-none"
        />
      </div>
      <Select<AuditFilterValues["source"]>
        name="source"
        value={values.source}
        onValueChange={(source) =>
          source && apply({ ...values, q: query, source })
        }
      >
        <SelectTrigger
          aria-label="Filter by source"
          className="min-w-32 rounded-xl border-border px-3 shadow-none"
        >
          <SelectValue>
            {(value) =>
              sourceOptions.find((option) => option.value === value)?.label
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            {sourceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Popover
        open={dateOpen}
        onOpenChange={(open) => {
          if (open) {
            setFrom(values.from);
            setTo(values.to);
          }
          setDateOpen(open);
        }}
      >
        <PopoverTrigger
          nativeButton
          render={
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl border-border bg-card px-3 font-normal shadow-none"
            />
          }
        >
          <CalendarDays
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          {dateLabel}
          <ChevronDown
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-72 space-y-4 rounded-2xl p-4"
        >
          <p className="text-sm font-medium">Filter by date</p>
          <div className="space-y-1.5">
            <label htmlFor="audit-filter-from" className="text-sm font-medium">
              From date
            </label>
            <DatePicker
              id="audit-filter-from"
              value={from}
              onValueChange={setFrom}
              max={to || undefined}
              placeholder="Any start date"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="audit-filter-to" className="text-sm font-medium">
              To date
            </label>
            <DatePicker
              id="audit-filter-to"
              value={to}
              onValueChange={setTo}
              min={from || undefined}
              placeholder="Any end date"
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border-lighter pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                apply({ ...values, q: query, from: "", to: "" });
                setDateOpen(false);
              }}
            >
              Any date
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                apply({ ...values, q: query, from, to });
                setDateOpen(false);
              }}
            >
              Apply dates
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            setQuery("");
            apply({
              q: "",
              actor: "",
              event: "",
              source: "all",
              from: "",
              to: "",
            });
          }}
        >
          <X className="size-3.5" aria-hidden="true" /> Clear filters
        </Button>
      ) : null}
      <button type="submit" className="sr-only" tabIndex={-1}>
        Search audit events
      </button>
      {values.actor || values.event ? (
        <p className="w-full text-sm text-muted-foreground">
          {values.actor ? `Actor: ${values.actor}` : ""}
          {values.actor && values.event ? " · " : ""}
          {values.event ? `Event: ${values.event}` : ""}
        </p>
      ) : null}
    </form>
  );
}
