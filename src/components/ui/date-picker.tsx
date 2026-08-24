"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";

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
  /** Shows a Clear action — leave off for required fields. */
  clearable?: boolean;
  size?: "default" | "sm";
  className?: string;
};

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
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const minDate = fromDateKey(min);
  const maxDate = fromDateKey(max);
  const selected = fromDateKey(value);
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
              "w-full justify-start border-input px-2.5 font-normal shadow-xs",
              size === "sm" ? "h-8 text-xs" : "h-9",
              !selected && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon
          className={cn("shrink-0 text-muted-foreground", size === "sm" && "size-3.5")}
          aria-hidden="true"
        />
        <span className="truncate">
          {selected ? formatDateKey(value) : placeholder}
        </span>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
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
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
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
