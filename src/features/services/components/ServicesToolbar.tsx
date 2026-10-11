import type { ComponentType } from "react";
import { LayoutGrid, Rows3, Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { cn } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  SERVICE_CATEGORY_LABELS,
  type ServiceCategory,
} from "~/features/services/service-utils";
import type { ServiceView } from "~/features/services/hooks/useServiceView";

export type CategoryFilter = "all" | ServiceCategory | "one-visit";
export type SortOption = "az" | "fee";

// `shortLabel` drives the <640px chip label so long categories like
// "Copies & endorsements" don't each take a whole line of the wrap.
const CATEGORY_FILTERS: {
  value: CategoryFilter;
  label: string;
  shortLabel: string;
}[] = [
  { value: "all", label: "All", shortLabel: "All" },
  {
    value: "birth",
    label: SERVICE_CATEGORY_LABELS.birth,
    shortLabel: "Birth",
  },
  {
    value: "marriage",
    label: SERVICE_CATEGORY_LABELS.marriage,
    shortLabel: "Marriage",
  },
  {
    value: "death",
    label: SERVICE_CATEGORY_LABELS.death,
    shortLabel: "Death",
  },
  {
    value: "copies",
    label: SERVICE_CATEGORY_LABELS.copies,
    shortLabel: "Copies",
  },
  {
    value: "corrections",
    label: SERVICE_CATEGORY_LABELS.corrections,
    shortLabel: "Corrections",
  },
  {
    value: "one-visit",
    label: "Finished in one visit",
    shortLabel: "1-visit",
  },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "az", label: "A–Z" },
  { value: "fee", label: "Lowest fee" },
];

const VIEW_OPTIONS: {
  value: ServiceView;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    value: "cards",
    label: "Cards",
    hint: "Show services as compact cards",
    icon: LayoutGrid,
  },
  {
    value: "rows",
    label: "List",
    hint: "Show services as a one-line-each list",
    icon: Rows3,
  },
];

interface ServicesToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  category: CategoryFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  view: ServiceView;
  onViewChange: (value: ServiceView) => void;
  categoryCounts: Record<CategoryFilter, number>;
}

export function ServicesToolbar({
  searchTerm,
  onSearchTermChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  categoryCounts,
}: ServicesToolbarProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <InputGroup className="h-11 w-auto flex-[1_1_280px] rounded-full border-transparent bg-muted px-1.5 shadow-none">
          <InputGroupInput
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Search a service or document"
          />
          <InputGroupAddon>
            <Search className="size-4.5" aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>

        <ToggleGroup
          aria-label="Service layout"
          value={[view]}
          onValueChange={(values: string[]) => {
            const nextView = values[0] as ServiceView | undefined;
            if (nextView) onViewChange(nextView);
          }}
          spacing={1}
          className="rounded-full bg-muted p-1"
        >
          {VIEW_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              title={option.hint}
              className="h-11 gap-2 rounded-full px-3.5 font-semibold text-body-2 aria-pressed:bg-foreground aria-pressed:text-white aria-pressed:hover:bg-foreground aria-pressed:hover:text-white sm:h-9"
            >
              <option.icon data-icon="inline-start" aria-hidden="true" />
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort</span>
          <Select
            items={SORT_OPTIONS}
            value={sort}
            onValueChange={(value) => onSortChange(value as SortOption)}
          >
            <SelectTrigger className="rounded-full border-border px-3.5 text-sm shadow-none data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chips wrap rather than scroll, so every category is on screen at once. */}
      <Tabs
        value={category}
        onValueChange={(value) => onCategoryChange(value as CategoryFilter)}
      >
        <TabsList
          variant="pill"
          aria-label="Filter services by category"
          className="w-full flex-wrap justify-start gap-2 rounded-none bg-transparent p-0"
        >
          {CATEGORY_FILTERS.map((filter) => {
            const isActive = category === filter.value;
            const count = categoryCounts[filter.value];
            const showCount = filter.value === "all" || count > 0;
            return (
              <TabsTrigger
                key={filter.value}
                value={filter.value}
                className={cn(
                  "h-11 flex-none gap-2 border-border bg-white pl-3.5 text-[13px] data-active:border-foreground sm:h-9",
                  showCount ? "pr-1.5" : "pr-3.5",
                )}
              >
                <span className="sm:hidden">{filter.shortLabel}</span>
                <span className="hidden sm:inline">{filter.label}</span>
                {showCount && (
                  <span
                    className={cn(
                      "flex h-6 min-w-6 items-center justify-center rounded-full px-1.75 text-xs",
                      isActive ? "bg-white/15 text-white" : "bg-muted text-body-2",
                    )}
                  >
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
