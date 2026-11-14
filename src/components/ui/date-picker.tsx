"use client";

import * as React from "react";
import { CalendarIcon, ChevronDownIcon, X } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { FieldError } from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  formatDateInput,
  formatDateKey,
  fromDateKey,
  maskDateInput,
  parseDateInput,
  toDateKey,
} from "~/lib/date";

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
  /** Use an editable MM/DD/YYYY field instead of a button trigger. */
  trigger?: "button" | "input";
  /** Shows a Clear action — leave off for required fields. */
  clearable?: boolean;
  /** The same scale as Input and SelectTrigger: sm 32px, default 36px, lg 40px. */
  size?: "default" | "sm" | "lg";
  shape?: React.ComponentProps<typeof Button>["shape"];
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
  placeholder: placeholderProp,
  disabled,
  invalid,
  clearable = true,
  size = "lg",
  shape = "pill",
  icon = "chevron",
  trigger = "button",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(() => formatDateInput(value));
  const [inputError, setInputError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const minDate = fromDateKey(min);
  const maxDate = fromDateKey(max);
  const selected = fromDateKey(value);
  const placeholder =
    placeholderProp ?? (trigger === "input" ? "MM/DD/YYYY" : "Select a date");
  const now = new Date();
  const calendarStart = minDate ?? new Date(now.getFullYear() - 150, 0, 1);
  const calendarEnd = maxDate ?? new Date(now.getFullYear() + 20, 11, 31);
  const todayKey = toDateKey();
  const todayInRange =
    (!min || todayKey >= min) && (!max || todayKey <= max);

  React.useEffect(() => {
    setDraft(formatDateInput(value));
    setInputError(null);
    inputRef.current?.setCustomValidity("");
  }, [value]);

  function clampToRange(date: Date) {
    if (minDate && date < minDate) return minDate;
    if (maxDate && date > maxDate) return maxDate;
    return date;
  }

  function commit(next: string) {
    setDraft(formatDateInput(next));
    setInputError(null);
    inputRef.current?.setCustomValidity("");
    onValueChange(next);
    setOpen(false);
    // React Hook Form validates on blur; the trigger never fires one on its own.
    onBlur?.();
  }

  function getInputError(next: string) {
    const key = parseDateInput(next);
    if (!key) return "Use MM/DD/YYYY.";
    if (min && key < min) {
      return `Earliest: ${formatDateInput(min)}.`;
    }
    if (max && key > max) {
      return `Latest: ${formatDateInput(max)}.`;
    }
    return null;
  }

  function handleInputBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (!draft) {
      event.currentTarget.setCustomValidity("");
      setInputError(null);
      onValueChange("");
      onBlur?.();
      return;
    }
    const error = getInputError(draft);
    event.currentTarget.setCustomValidity(error ?? "");
    setInputError(error);
    if (!error) onValueChange(parseDateInput(draft) ?? "");
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
      {trigger === "input" ? (
        <div className="flex w-full flex-col gap-1">
          <InputGroup
            fieldSize={size === "sm" ? "default" : size}
            shape={shape ?? "pill"}
            data-disabled={disabled || undefined}
            className={className}
          >
            <InputGroupInput
              ref={inputRef}
              id={id}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              value={draft}
              placeholder={placeholder}
              disabled={disabled}
              aria-invalid={invalid || Boolean(inputError)}
              aria-describedby={inputError && id ? `${id}-error` : undefined}
              onChange={(event) => {
                const next = maskDateInput(event.target.value);
                event.currentTarget.setCustomValidity("");
                setDraft(next);
                setInputError(null);
                if (!next) onValueChange("");
                const key = parseDateInput(next);
                if (key && (!min || key >= min) && (!max || key <= max)) {
                  onValueChange(key);
                }
              }}
              onBlur={handleInputBlur}
            />
            <InputGroupAddon align="inline-end">
              <PopoverTrigger
                nativeButton
                render={
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Open calendar"
                    disabled={disabled}
                  />
                }
              >
                <CalendarIcon aria-hidden="true" />
              </PopoverTrigger>
            </InputGroupAddon>
          </InputGroup>
          <div className="min-h-4">
            {inputError ? (
              <FieldError
                id={id ? `${id}-error` : undefined}
                className="text-xs leading-4"
              >
                {inputError}
              </FieldError>
            ) : null}
          </div>
        </div>
      ) : (
        <PopoverTrigger
          nativeButton
          render={
            <Button
              type="button"
              variant="outline"
              shape={shape}
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
              className={cn(
                "text-muted-foreground",
                size === "sm" && "size-3.5",
              )}
              aria-hidden="true"
            />
          ) : icon === "chevron" ? (
            <ChevronDownIcon
              data-icon="inline-end"
              className={cn(
                "text-muted-foreground",
                size === "sm" && "size-3.5",
              )}
              aria-hidden="true"
            />
          ) : null}
        </PopoverTrigger>
      )}

      {/* Calendar already pads itself, so the popover adds none. */}
      <PopoverContent
        side="bottom"
        align="start"
        collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "none" }}
        className="w-auto overflow-y-auto p-0"
      >
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
