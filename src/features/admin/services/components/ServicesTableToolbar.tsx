import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "~/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

const CLASSIFICATION_FILTERS = [
  "all",
  "simple",
  "complex",
  "highly_technical",
] as const;
export type ClassificationFilter = (typeof CLASSIFICATION_FILTERS)[number];

interface ServicesTableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  classificationFilter: ClassificationFilter;
  onClassificationFilterChange: (value: ClassificationFilter) => void;
}

export function ServicesTableToolbar({
  globalFilter,
  onGlobalFilterChange,
  classificationFilter,
  onClassificationFilterChange,
}: ServicesTableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by service name or code..."
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="h-10 rounded-lg border-border pl-10 text-sm focus-visible:border-primary focus-visible:ring-primary"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filter Classification:</span>
        </div>
        <ToggleGroup
          value={[classificationFilter]}
          onValueChange={(values: string[]) => {
            // base-ui returns all currently active values — take the last selected
            const next = values[values.length - 1] as ClassificationFilter;
            if (next) onClassificationFilterChange(next);
          }}
          className="rounded-lg border border-border-strong bg-surface-subtle p-0.5"
        >
          {CLASSIFICATION_FILTERS.map((cls) => (
            <ToggleGroupItem
              key={cls}
              value={cls}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=checked]:border data-[state=checked]:border-border data-[state=checked]:bg-white data-[state=checked]:text-foreground data-[state=checked]:shadow-xs"
            >
              {cls === "all"
                ? "All"
                : cls
                    .replace("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
