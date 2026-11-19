import { useRef, useState, type ReactNode, type Ref } from "react";
import { Field, FieldGroup } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { fromDateKey, toDateKey } from "~/lib/date";
import { cn } from "~/lib/utils";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, index) => ({ label, value: String(index + 1).padStart(2, "0") }));

function dateParts(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return { year, month, day };
}

type DatePart = "month" | "day" | "year";
type VisitedParts = Partial<Record<DatePart, boolean>>;

type BirthDatePickerProps = {
  id: string;
  labelledBy: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  validateAll?: boolean;
  renderFeedback?: (invalid: boolean) => ReactNode;
  disabled?: boolean;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
};

/** Month / Day / Year controls that keep the form's YYYY-MM-DD answer. */
export function BirthDatePicker({
  id, labelledBy, value, onValueChange, onBlur, min, max = toDateKey(),
  invalid, validateAll, renderFeedback, disabled, className, ref,
}: BirthDatePickerProps) {
  const [draft, setDraft] = useState(() => ({ value, ...dateParts(value), visited: {} as VisitedParts }));
  const openPart = useRef<DatePart | null>(null);
  // Preserve incomplete selections, but follow restored drafts and form resets.
  if (draft.value !== value) {
    setDraft({ value, ...dateParts(value), visited: {} });
  }

  // A missing date is one form answer, but each dropdown is visited separately.
  // Complete dates can still have a date-level error from the form validator.
  function isPartInvalid(part: DatePart) {
    return Boolean(invalid && (value || ((validateAll || draft.visited[part]) && !draft[part])));
  }
  const showInvalid = (["month", "day", "year"] as const).some(isPartInvalid);

  function blurPart(part: DatePart) {
    setDraft((current) => ({ ...current, visited: { ...current.visited, [part]: true } }));
    onBlur?.();
  }

  const lastYear = Number(max.slice(0, 4));
  const firstYear = min ? Number(min.slice(0, 4)) : Math.min(lastYear - 150, Number(draft.year) || lastYear);
  const years = Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, index) => {
    const year = String(lastYear - index);
    return { label: year, value: year };
  });
  // Without a year, keep February 29 available until a year is chosen.
  const daysInMonth = new Date(Number(draft.year) || 2000, Number(draft.month) || 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => ({
    label: String(index + 1), value: String(index + 1).padStart(2, "0"),
  }));

  function available(part: DatePart, candidate: string) {
    const next = { ...draft, [part]: candidate };
    if (!next.year) return true;
    const count = new Date(Number(next.year), Number(next.month) || 1, 0).getDate();
    const day = Number(next.day) <= count ? next.day : "";
    const start = `${next.year}-${next.month || "01"}-${day || "01"}`;
    const end = `${next.year}-${next.month || "12"}-${day || "31"}`;
    return (!min || end >= min) && start <= max;
  }

  function changePart(part: DatePart, selected: string | null) {
    const next = { ...draft, [part]: selected ?? "" };
    const count = new Date(Number(next.year) || 2000, Number(next.month) || 1, 0).getDate();
    // Ask for a new day when changing February 29 or the 31st to a shorter month.
    if (Number(next.day) > count) next.day = "";
    const key = `${next.year}-${next.month}-${next.day}`;
    const nextValue = fromDateKey(key) && (!min || key >= min) && key <= max ? key : "";
    setDraft({ ...next, value: nextValue });
    onValueChange(nextValue);
  }

  return (
    <Field className="@container/birth-date min-w-0" data-invalid={showInvalid} aria-labelledby={labelledBy}>
      <FieldGroup className="grid grid-cols-2 gap-2 @min-[320px]/birth-date:grid-cols-[1.7fr_0.9fr_1.15fr]">
        {([
          { part: "month", label: "Month", items: months },
          { part: "day", label: "Day", items: days },
          { part: "year", label: "Year", items: years },
        ] as const).map(({ part, label, items }) => (
          <Select
            // Recreate the day menu when its options change so Base UI cannot
            // restore an earlier day after the selected day is removed.
            key={part === "day" ? `day-${draft.month}-${draft.year}` : part}
            items={items}
            value={draft[part] || null}
            onValueChange={(next) => changePart(part, next)}
            onOpenChange={(open) => {
              openPart.current = open ? part : null;
              if (!open) blurPart(part);
            }}
            disabled={disabled}
          >
            <SelectTrigger
              id={part === "month" ? id : `${id}-${part}`}
              ref={part === "month" ? ref : undefined}
              aria-label={label}
              aria-invalid={isPartInvalid(part)}
              onBlur={() => {
                // Opening the portalled list moves focus off the trigger;
                // validate only once that part is closed or left behind.
                if (openPart.current !== part) blurPart(part);
              }}
              className={cn(
                "w-full min-w-0 text-foreground",
                part === "month" && "col-span-2 @min-[320px]/birth-date:col-span-1",
                className,
              )}
            >
              <SelectValue placeholder={label} />
            </SelectTrigger>
            <SelectContent className="service-form-options" alignItemWithTrigger={false}>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    disabled={!available(part, item.value)}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ))}
      </FieldGroup>
      {renderFeedback?.(showInvalid)}
    </Field>
  );
}
