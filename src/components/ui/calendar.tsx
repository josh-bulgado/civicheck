"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { addDays, addMonths, fromDateKey, isSameDay, toDateKey } from "~/lib/date";

const WEEKDAYS = [
  { short: "Su", long: "Sunday" },
  { short: "Mo", long: "Monday" },
  { short: "Tu", long: "Tuesday" },
  { short: "We", long: "Wednesday" },
  { short: "Th", long: "Thursday" },
  { short: "Fr", long: "Friday" },
  { short: "Sa", long: "Saturday" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function clamp(date: Date, min: Date | null, max: Date | null) {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

/** The 42 cells of a six-week grid, starting on the Sunday on or before the 1st. */
function buildGrid(month: Date) {
  const first = startOfMonth(month);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export type CalendarProps = {
  /** Selected date as YYYY-MM-DD, or "" when nothing is chosen. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Earliest selectable date, as YYYY-MM-DD. */
  min?: string;
  /** Latest selectable date, as YYYY-MM-DD. */
  max?: string;
  /** Moves keyboard focus into the grid on mount — used when opened in a popover. */
  autoFocus?: boolean;
  className?: string;
};

export function Calendar({
  value = "",
  onValueChange,
  min,
  max,
  autoFocus = false,
  className,
}: CalendarProps) {
  const today = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const minDate = React.useMemo(() => fromDateKey(min), [min]);
  const maxDate = React.useMemo(() => fromDateKey(max), [max]);
  const selected = React.useMemo(() => fromDateKey(value), [value]);

  const anchor = React.useMemo(
    () => selected ?? clamp(today, minDate, maxDate),
    // Only used to seed the initial view; later navigation is user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [viewMonth, setViewMonth] = React.useState(() => startOfMonth(anchor));
  const [focusedDate, setFocusedDate] = React.useState(anchor);

  // Jumping to a different month from outside (a new value) should follow along.
  React.useEffect(() => {
    if (!selected) return;
    setViewMonth(startOfMonth(selected));
    setFocusedDate(selected);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const gridRef = React.useRef<HTMLDivElement>(null);
  const shouldFocusRef = React.useRef(false);

  const focusDay = React.useCallback((date: Date) => {
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${toDateKey(date)}"]`)
      ?.focus();
  }, []);

  // Deferred a frame so it lands after the popover has finished moving focus
  // into its popup, otherwise that focus wins and the arrow keys do nothing.
  React.useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => focusDay(focusedDate));
    return () => cancelAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    focusDay(focusedDate);
  }, [focusedDate, focusDay]);

  const isDisabled = React.useCallback(
    (date: Date) =>
      Boolean((minDate && date < minDate) || (maxDate && date > maxDate)),
    [minDate, maxDate],
  );

  function moveFocus(next: Date) {
    const target = clamp(next, minDate, maxDate);
    shouldFocusRef.current = true;
    setFocusedDate(target);
    if (
      target.getFullYear() !== viewMonth.getFullYear() ||
      target.getMonth() !== viewMonth.getMonth()
    ) {
      setViewMonth(startOfMonth(target));
    }
  }

  function select(date: Date) {
    if (isDisabled(date)) return;
    setFocusedDate(date);
    setViewMonth(startOfMonth(date));
    onValueChange?.(toDateKey(date));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const handlers: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusedDate, -1),
      ArrowRight: () => addDays(focusedDate, 1),
      ArrowUp: () => addDays(focusedDate, -7),
      ArrowDown: () => addDays(focusedDate, 7),
      Home: () => addDays(focusedDate, -focusedDate.getDay()),
      End: () => addDays(focusedDate, 6 - focusedDate.getDay()),
      PageUp: () => addMonths(focusedDate, -1),
      PageDown: () => addMonths(focusedDate, 1),
    };

    const handler = handlers[event.key];
    if (handler) {
      event.preventDefault();
      moveFocus(handler());
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(focusedDate);
    }
  }

  // Year choices span the allowed range, falling back to a window wide enough
  // for a date of birth when the field is open-ended.
  const firstYear = minDate ? minDate.getFullYear() : today.getFullYear() - 100;
  const lastYear = maxDate ? maxDate.getFullYear() : today.getFullYear() + 10;
  const years = React.useMemo(
    () =>
      Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i),
    [firstYear, lastYear],
  );

  const monthDisabled = (monthIndex: number) => {
    const first = new Date(viewMonth.getFullYear(), monthIndex, 1);
    return isDisabled(first) && isDisabled(endOfMonth(first));
  };

  const previousMonth = addMonths(viewMonth, -1);
  const nextMonth = addMonths(viewMonth, 1);
  const grid = buildGrid(viewMonth);

  return (
    <div className={cn("w-fit select-none", className)}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setViewMonth(startOfMonth(previousMonth))}
          disabled={isDisabled(endOfMonth(previousMonth))}
          aria-label="Previous month"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        <Select
          value={String(viewMonth.getMonth())}
          onValueChange={(month) =>
            setViewMonth(
              new Date(viewMonth.getFullYear(), Number(month), 1),
            )
          }
        >
          <SelectTrigger size="sm" className="flex-1" aria-label="Month">
            <SelectValue>
              {(month) => MONTHS[Number(month)]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {MONTHS.map((month, index) => (
                <SelectItem
                  key={month}
                  value={String(index)}
                  disabled={monthDisabled(index)}
                >
                  {month}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={String(viewMonth.getFullYear())}
          onValueChange={(year) =>
            setViewMonth(new Date(Number(year), viewMonth.getMonth(), 1))
          }
        >
          <SelectTrigger size="sm" className="w-22" aria-label="Year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => setViewMonth(startOfMonth(nextMonth))}
          disabled={isDisabled(startOfMonth(nextMonth))}
          aria-label="Next month"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7">
        {WEEKDAYS.map((weekday) => (
          <abbr
            key={weekday.short}
            title={weekday.long}
            className="flex size-9 items-center justify-center text-xs font-medium text-muted-foreground no-underline"
          >
            {weekday.short}
          </abbr>
        ))}
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={`${MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`}
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-y-0.5"
      >
        {grid.map((date) => {
          const key = toDateKey(date);
          const outside = date.getMonth() !== viewMonth.getMonth();
          const disabled = isDisabled(date);
          const isSelected = selected != null && isSameDay(date, selected);
          const isToday = isSameDay(date, today);

          return (
            <button
              key={key}
              type="button"
              data-date={key}
              role="gridcell"
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              disabled={disabled}
              tabIndex={isSameDay(date, focusedDate) ? 0 : -1}
              onClick={() => select(date)}
              onFocus={() => setFocusedDate(date)}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-md text-sm transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-30",
                outside && "text-muted-foreground/50",
                !isSelected && "hover:bg-muted",
                isToday &&
                  !isSelected &&
                  "font-semibold text-primary ring-1 ring-inset ring-primary/40",
                isSelected &&
                  "bg-primary font-semibold text-primary-foreground hover:bg-primary",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
