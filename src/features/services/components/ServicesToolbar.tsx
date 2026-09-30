import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
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
import {
  SERVICE_CATEGORY_LABELS,
  type ServiceCategory,
} from "~/features/services/service-utils";
import type { ServiceView } from "~/features/services/hooks/useServiceView";

export type CategoryFilter = "all" | ServiceCategory | "one-visit";
export type SortOption = "az" | "fee";

// `shortLabel` drives the <640px tab label so long categories like
// "Copies & endorsements" don't blow out the scroll track.
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
  const listRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const maxScroll = list.scrollWidth - list.clientWidth;
    setEdges((prev) => {
      const left = list.scrollLeft > 1;
      const right = maxScroll > 1 && list.scrollLeft < maxScroll - 1;
      return prev.left === left && prev.right === right
        ? prev
        : { left, right };
    });
  }, []);

  // Keep the fade affordances in sync with the real scrollable width — on mount,
  // on every scroll, and whenever the track's content or viewport resizes.
  useEffect(() => {
    updateEdges();
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(list);
    for (const child of Array.from(list.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [updateEdges]);

  // Center the active tab on mount and whenever the filter changes so the
  // selection is never parked off-screen on narrow viewports.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const index = CATEGORY_FILTERS.findIndex(
      (filter) => filter.value === category,
    );
    if (index < 0) return;
    const trigger = list.querySelectorAll<HTMLElement>(
      '[data-slot="tabs-trigger"]',
    )[index];
    if (!trigger) return;
    const listRect = list.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const delta =
      triggerRect.left -
      listRect.left -
      (listRect.width - triggerRect.width) / 2;
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      left: list.scrollLeft + delta,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [category]);

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

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <Tabs
          value={category}
          onValueChange={(value) => onCategoryChange(value as CategoryFilter)}
          className="w-full min-w-0 lg:flex-1"
        >
          <div className="relative min-w-0">
            <TabsList
              ref={listRef}
              variant="accent"
              aria-label="Filter services by category"
              onScroll={updateEdges}
              className={cn(
                "relative h-auto w-fit max-w-full justify-start gap-1 overflow-x-auto rounded-lg bg-muted p-1",
                "group-data-horizontal/tabs:h-auto",
                "no-scrollbar scroll-p-1 snap-x snap-mandatory",
              )}
            >
              {CATEGORY_FILTERS.map((filter) => {
                const isActive = category === filter.value;
                const count = categoryCounts[filter.value];
                const showCount = filter.value === "all" || count > 0;
                return (
                  <TabsTrigger
                    key={filter.value}
                    value={filter.value}
                    className="h-11 flex-none shrink-0 snap-start gap-1 px-3 sm:h-10 sm:gap-1.5"
                  >
                    <span className="sm:hidden">{filter.shortLabel}</span>
                    <span className="hidden sm:inline">{filter.label}</span>
                    {showCount && (
                      <Badge
                        variant={filter.value === "all" ? "secondary" : "info"}
                        className={cn(
                          "ml-1 h-4 min-w-4 justify-center px-1 text-[10px] leading-none sm:ml-2 sm:h-5 sm:min-w-5 sm:px-2 sm:text-xs",
                          isActive &&
                            "bg-white/20 text-primary-foreground ring-0",
                        )}
                      >
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {edges.left && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-6 rounded-l-lg bg-gradient-to-r from-muted to-transparent sm:w-8"
              />
            )}
            {edges.right && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-lg bg-gradient-to-l from-muted to-transparent sm:w-8"
              />
            )}
          </div>
        </Tabs>

        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 lg:w-auto">
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
                className="h-11 sm:h-9"
              >
                <option.icon data-icon="inline-start" aria-hidden="true" />
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <span className="text-[15px] text-muted-foreground">Sort</span>
            <Select
              items={SORT_OPTIONS}
              value={sort}
              onValueChange={(value) => onSortChange(value as SortOption)}
            >
              <SelectTrigger className="h-11 rounded-lg border-control-border text-[15px] sm:h-9">
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
