"use client";

import * as React from "react";
import { CalendarIcon, ChevronDownIcon, X } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { formatDateKey, fromDateKey, toDateKey } from "~/lib/date";

export type DatePickerProps = {
  id?: string;
  /** Selected date as YYYY-MM-DD, or "" when nothing is chosen. */
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** The glyph at the right of the trigger. Defaults to a chevron. */
  icon?: "chevron" | "calendar" | "none";
  /** Shows a Clear action — leave off for required fields. */
  clearable?: boolean;
  /** The same scale as Input and SelectTrigger: sm 32px, default 36px, lg 40px. */
  size?: "default" | "sm" | "lg";
  className?: string;
};

const triggerSizeClasses = {
  sm: "h-8 text-xs",
  default: "h-9",
  lg: "h-10 px-3",
} as const;

export function DatePicker({
  id,
  value,
  onValueChange,
  onBlur,
  min,
  max,
  placeholder = "Select a date",
  disabled,
  invalid,
  clearable = true,
  size = "default",
  icon = "chevron",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const minDate = fromDateKey(min);
  const maxDate = fromDateKey(max);
  const selected = fromDateKey(value);
  const now = new Date();
  const calendarStart = minDate ?? new Date(now.getFullYear() - 150, 0, 1);
  const calendarEnd = maxDate ?? new Date(now.getFullYear() + 20, 11, 31);
  const todayKey = toDateKey();
  const todayInRange =
    (!min || todayKey >= min) && (!max || todayKey <= max);

  function clampToRange(date: Date) {
    if (minDate && date < minDate) return minDate;
    if (maxDate && date > maxDate) return maxDate;
    return date;
  }

  function commit(next: string) {
    onValueChange(next);
    setOpen(false);
    // React Hook Form validates on blur; the trigger never fires one on its own.
    onBlur?.();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) onBlur?.();
      }}
    >
      <PopoverTrigger
        nativeButton
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            aria-invalid={invalid}
            className={cn(
              // Same surface as Input/SelectTrigger: the outline variant's
              // bg-background is a tinted gray in light mode, so reset it.
              "w-full justify-between border-input bg-transparent px-2.5 text-left font-normal shadow-xs",
              triggerSizeClasses[size],
              !selected && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <span className="truncate">
          {selected ? formatDateKey(value) : placeholder}
        </span>
        {icon === "calendar" ? (
          <CalendarIcon
            data-icon="inline-end"
            className={cn("text-muted-foreground", size === "sm" && "size-3.5")}
            aria-hidden="true"
          />
        ) : icon === "chevron" ? (
          <ChevronDownIcon
            data-icon="inline-end"
            className={cn("text-muted-foreground", size === "sm" && "size-3.5")}
            aria-hidden="true"
          />
        ) : null}
      </PopoverTrigger>

      {/* Calendar already pads itself, so the popover adds none. */}
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={calendarStart}
          endMonth={calendarEnd}
          selected={selected ?? undefined}
          onSelect={(date) => {
            if (date) commit(toDateKey(date));
          }}
          defaultMonth={selected ?? clampToRange(new Date())}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          autoFocus
        />
        {(todayInRange || (clearable && value)) && (
          <div className="flex items-center justify-between gap-2 border-t border-border p-3">
            {todayInRange ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => commit(todayKey)}
              >
                Today
              </Button>
            ) : (
              <span />
            )}
            {clearable && value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => commit("")}
              >
                <X aria-hidden="true" />
                Clear
              </Button>
            ) : (
              <span />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
