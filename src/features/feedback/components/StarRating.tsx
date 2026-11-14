import { useId } from "react";
import { Star } from "lucide-react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "~/components/ui/radio-group";
import { FieldLegend, FieldSet } from "~/components/ui/field";
import { cn } from "~/lib/utils";

export function StarRating({
  question,
  labels,
  value,
  onChange,
  required = false,
  disabled = false,
  invalid = false,
}: {
  question: string;
  labels: readonly string[];
  value: number | null;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const id = useId();
  return (
    <FieldSet
      className="gap-2"
      disabled={disabled}
      data-invalid={invalid || undefined}
    >
      <FieldLegend id={`${id}-question`} variant="label" className="mb-1">
        {question}
        {!required && (
          <span className="text-muted-foreground"> (optional)</span>
        )}
      </FieldLegend>
      <RadioGroup
        aria-labelledby={`${id}-question`}
        aria-describedby={`${id}-label`}
        aria-required={required}
        aria-invalid={invalid || undefined}
        value={value === null ? null : String(value)}
        onValueChange={(next) => onChange(Number(next))}
        disabled={disabled}
        className="grid grid-cols-5 gap-1"
      >
        {labels.map((label, index) => (
          <Radio.Root
            key={label}
            value={String(index + 1)}
            render={<button type="button" />}
            nativeButton
            aria-label={`${index + 1} ${index === 0 ? "star" : "stars"}: ${label}`}
            className={cn(
              "flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-border outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none",
              value !== null && index < value
                ? "border-primary/30 bg-primary-soft text-primary"
                : "bg-card text-muted-foreground",
            )}
          >
            <Star
              className="size-7"
              fill={value !== null && index < value ? "currentColor" : "none"}
              aria-hidden="true"
            />
            <span className="text-xs">{index + 1}</span>
          </Radio.Root>
        ))}
      </RadioGroup>
      <p
        id={`${id}-label`}
        aria-live="polite"
        className="min-h-5 text-center text-sm font-medium text-primary"
      >
        {value ? labels[value - 1] : "Select a rating"}
      </p>
      <div
        className="flex justify-between gap-3 text-xs text-muted-foreground"
        aria-hidden="true"
      >
        <span>{labels[0]}</span>
        <span className="text-right">{labels[4]}</span>
      </div>
    </FieldSet>
  );
}
