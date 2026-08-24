import type { ComponentType } from "react";
import { LayoutGrid, Rows3, Search } from "lucide-react";
import { Badge } from "~/components/ui/badge";
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
import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from "~/features/services/service-utils";
import type { ServiceView } from "~/features/services/hooks/useServiceView";

export type CategoryFilter = "all" | ServiceCategory | "one-visit";
export type SortOption = "az" | "fee";

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "birth", label: SERVICE_CATEGORY_LABELS.birth },
  { value: "marriage", label: SERVICE_CATEGORY_LABELS.marriage },
  { value: "death", label: SERVICE_CATEGORY_LABELS.death },
  { value: "copies", label: SERVICE_CATEGORY_LABELS.copies },
  { value: "corrections", label: SERVICE_CATEGORY_LABELS.corrections },
  { value: "one-visit", label: "Finished in one visit" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "az", label: "A–Z" },
  { value: "fee", label: "Lowest fee first" },
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
    <div className="flex flex-col gap-4">
      <InputGroup className="h-12">
        <InputGroupInput
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Search a service or document"
        />
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={category}
          onValueChange={(value) => onCategoryChange(value as CategoryFilter)}
          className="min-w-0"
        >
          <TabsList variant="accent" className="max-w-full overflow-x-auto">
            <TabsTrigger value="all">
              All
              <Badge
                variant="secondary"
                className={cn(
                  "ml-2",
                  category === "all" && "bg-white/20 text-primary-foreground",
                )}
              >
                {categoryCounts.all}
              </Badge>
            </TabsTrigger>
            {CATEGORY_FILTERS.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value}>
                {filter.label}
                {categoryCounts[filter.value] > 0 && (
                  <Badge
                    variant="info"
                    className={cn(
                      "ml-2",
                      category === filter.value &&
                        "bg-white/20 text-primary-foreground ring-0",
                    )}
                  >
                    {categoryCounts[filter.value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <ToggleGroup
            aria-label="Service layout"
            value={[view]}
            onValueChange={(values: string[]) => {
              const nextView = values[0] as ServiceView | undefined;
              if (nextView) onViewChange(nextView);
            }}
            variant="outline"
            size="sm"
            spacing={0}
          >
            {VIEW_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                title={option.hint}
              >
                <option.icon data-icon="inline-start" aria-hidden="true" />
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex items-center gap-2">
            <span className="text-[15px] text-muted-foreground">Sort</span>
            <Select
              items={SORT_OPTIONS}
              value={sort}
              onValueChange={(value) => onSortChange(value as SortOption)}
            >
              <SelectTrigger className="h-9 rounded-lg border-control-border text-[15px]">
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
      </div>
    </div>
  );
}
