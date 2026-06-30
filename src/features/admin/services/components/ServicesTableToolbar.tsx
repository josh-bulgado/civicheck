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
    <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by service name or code..."
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="pl-10 h-10 border-slate-200 rounded-lg text-sm focus-visible:ring-primary focus-visible:border-primary"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-xs font-medium text-slate-500 mr-1">
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
          className="rounded-lg border border-slate-100 p-0.5 bg-slate-50/50"
        >
          {CLASSIFICATION_FILTERS.map((cls) => (
            <ToggleGroupItem
              key={cls}
              value={cls}
              className="px-3 py-1.5 text-xs font-medium rounded-md data-[state=checked]:bg-white data-[state=checked]:text-slate-900 data-[state=checked]:shadow-xs data-[state=checked]:border data-[state=checked]:border-slate-100 text-slate-500"
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
