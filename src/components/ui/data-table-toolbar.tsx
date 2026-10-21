import { useRef } from "react";
import { useHotkey, type HotkeyChord } from "@tanstack/react-hotkeys";
import { Search, type LucideIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Kbd } from "~/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { cn } from "~/lib/utils";

/*
 * The three controls every admin registry toolbar is made of (Services, Staff,
 * Requests): a search box, a row of count chips and a filter select. They live
 * here so a change to one is a change to all of them.
 */

/** Jumps to the search box; plain keys are ignored while a field has focus. */
export const SEARCH_HOTKEY: HotkeyChord = "/";

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible name, e.g. "Search staff". */
  label: string;
}

export function TableSearch({
  value,
  onChange,
  placeholder,
  label,
}: TableSearchProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const hotkeyLabel = useHotkeyLabel();
  useHotkey(SEARCH_HOTKEY, () => searchRef.current?.focus());

  return (
    <InputGroup size="lg" className="min-w-56 max-w-md flex-1">
      <InputGroupAddon>
        <Search aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        ref={searchRef}
        placeholder={placeholder}
        aria-label={label}
        aria-keyshortcuts={SEARCH_HOTKEY}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // Escape clears a search, and leaves the box once it is empty.
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          if (value) onChange("");
          else e.currentTarget.blur();
        }}
      />
      {value ? null : (
        <InputGroupAddon align="inline-end">
          <Kbd aria-hidden="true">{hotkeyLabel(SEARCH_HOTKEY)}</Kbd>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  /** Rows the chip would leave. Chips are the overview as well as the filter. */
  count: number;
  /** Background class for the leading dot, e.g. `bg-health-success-dot`. */
  dotClassName?: string;
}

interface FilterChipsProps<T extends string> {
  /** Accessible name of the group, e.g. "Filter by role". */
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<FilterChipOption<T>>;
}

export function FilterChips<T extends string>({
  label,
  value,
  onValueChange,
  options,
}: FilterChipsProps<T>) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(values: string[]) => {
        // base-ui returns every active value, so the new one is the last. An
        // empty list means the active chip was pressed again: keep it.
        const next = values[values.length - 1] as T | undefined;
        if (next) onValueChange(next);
      }}
      // lg height: the track is 40px, level with the search box and the selects.
      variant="pill"
      size="lg"
      className="flex-wrap"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.dotClassName ? (
            <span
              aria-hidden="true"
              className={cn("size-1.5 shrink-0 rounded-full", option.dotClassName)}
            />
          ) : null}
          {option.label}
          <span className="tabular-nums opacity-70">{option.count}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

interface FilterSelectProps {
  id: string;
  /** The thing being filtered, e.g. "Department". Names the select for screen readers. */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  /** Shows "<icon> Label:" before the select. */
  icon?: LucideIcon;
  /** Width of the trigger. */
  triggerClassName?: string;
  className?: string;
}

export function FilterSelect({
  id,
  label,
  value,
  onValueChange,
  options,
  icon: Icon,
  triggerClassName = "w-48",
  className,
}: FilterSelectProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Icon ? (
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Icon aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">{label}:</span>
        </div>
      ) : null}
      <Select
        value={value}
        // `items` lets the trigger show a label before the list has opened.
        items={options}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next);
        }}
      >
        <SelectTrigger
          id={id}
          className={triggerClassName}
          aria-label={`Filter by ${label.toLowerCase()}`}
          size="lg"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent variant="roomy">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
