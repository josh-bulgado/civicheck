import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Field, FieldContent, FieldLabel } from "~/components/ui/field";
import { cn } from "~/lib/utils";

/**
 * Pick-one questions with this many options or fewer render as visible tiles;
 * longer lists fall back to a dropdown. Every pick-one question in the apply
 * flow (service routing and case fields alike) goes through this one rule so a
 * yes/no never looks different from one service to the next.
 */
export const CHOICE_GROUP_MAX_OPTIONS = 4;

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}

/** True when a pick-one field should render as tiles instead of a dropdown. */
export function isChoiceGroup(options: readonly unknown[] | undefined) {
  return (
    options !== undefined &&
    options.length >= 2 &&
    options.length <= CHOICE_GROUP_MAX_OPTIONS
  );
}

/**
 * Whether a field's tiles need the full form width. Long labels and a 2x2 grid
 * get cramped in half a column; short ones stay beside their sibling field.
 */
export function choiceGroupIsWide(options: readonly ChoiceOption[]) {
  return (
    options.length >= CHOICE_GROUP_MAX_OPTIONS ||
    options.some((option) => option.label.length > 32)
  );
}

export type ChoicePlacement = "full" | "pair-start" | "pair-end";

/**
 * Decides where each tile group sits in the two-column field grid, so a choice
 * never leaves an empty cell beside it. Two short groups in a row share the line
 * (the bride/groom pairs); any other choice takes the full width. Non-choice
 * fields are left to the grid, and are never placed beside a choice.
 */
export function planChoiceLayout(
  fields: readonly { key: string; type: string; options?: readonly ChoiceOption[] }[],
) {
  const placements = new Map<string, ChoicePlacement>();
  const isChoice = (field: (typeof fields)[number] | undefined) =>
    field?.type === "select" && isChoiceGroup(field.options);
  const isPairable = (field: (typeof fields)[number] | undefined) =>
    isChoice(field) && !choiceGroupIsWide(field?.options ?? []);

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!isChoice(field)) continue;
    const next = fields[index + 1];
    if (isPairable(field) && next && isPairable(next)) {
      placements.set(field.key, "pair-start");
      placements.set(next.key, "pair-end");
      index += 1;
    } else {
      placements.set(field.key, "full");
    }
  }
  return placements;
}

// 1px gaps over a tinted container draw the dividers, so they stay correct for
// any column count (a divide-x/divide-y pair drops the row divider in a grid).
const groupClass =
  "grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border-light";

// No `h-full` on the label or its Field: grid items already stretch to the row,
// and Safari resolves the percentage against the wrong box, growing the tile far
// past the clipped group so its content is centered out of view.
const labelClass =
  "cursor-pointer bg-white has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border-0 *:data-[slot=field]:px-4 transition-colors hover:bg-primary-tint focus-within:bg-primary-tint has-data-checked:bg-primary-soft/70";

// Field top-aligns rows that contain FieldContent (and nudges the radio 1px);
// choice tiles are taller than their content, so center the radio and text.
const fieldClass =
  "min-h-14 flex-1 has-[>[data-slot=field-content]]:items-center has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-0";

// Four short options read as one compact row of tiles on a wide screen instead
// of a tall 2x2 block; they drop back to two columns below that.
const COMPACT_ROW_MAX_LABEL = 28;

function columnsClass(options: readonly ChoiceOption[], wide: boolean) {
  const count = options.length;
  if (wide) {
    if (
      count === 4 &&
      options.every((option) => option.label.length <= COMPACT_ROW_MAX_LABEL)
    ) {
      return "sm:grid-cols-2 lg:grid-cols-4";
    }
    // Three tiles share one row; any other odd count lets the last tile span.
    return count === 3
      ? "md:grid-cols-3"
      : "sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2";
  }
  // Half-width cell: a pair sits side by side, longer lists stack.
  return count === 2 ? "sm:grid-cols-2" : "";
}

export function ChoiceGroup({
  options,
  value,
  onValueChange,
  idPrefix,
  wide,
  invalid,
  labelledBy,
  className,
}: {
  options: readonly ChoiceOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Unique per question; each tile's id is `${idPrefix}-${option.value}`. */
  idPrefix: string;
  /** Defaults to what the options need; callers pass true for full-width rows. */
  wide?: boolean;
  invalid?: boolean;
  /** id of the legend naming the group, for the radiogroup role. */
  labelledBy?: string;
  className?: string;
}) {
  const isWide = wide ?? choiceGroupIsWide(options);

  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      className={cn(groupClass, columnsClass(options, isWide), className)}
    >
      {options.map((option) => {
        const id = `${idPrefix}-${option.value}`;
        return (
          <FieldLabel key={option.value} htmlFor={id} className={labelClass}>
            <Field orientation="horizontal" className={fieldClass}>
              <RadioGroupItem
                value={option.value}
                id={id}
                aria-invalid={invalid || undefined}
              />
              <FieldContent>
                {option.description ? (
                  <>
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </>
                ) : (
                  option.label
                )}
              </FieldContent>
            </Field>
          </FieldLabel>
        );
      })}
    </RadioGroup>
  );
}
