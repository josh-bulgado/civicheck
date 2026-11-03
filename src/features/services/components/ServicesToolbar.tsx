import { Search } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  SERVICE_CATEGORY_LABELS,
  type ServiceCategory,
} from "~/features/services/service-utils";

export type CategoryFilter = "all" | ServiceCategory;
/** `popular` (most requested first) is the applicant directory's default. */
export type SortOption = "popular" | "az" | "fee";

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
];

interface PortalServicesToolbarProps {
  /** The phone's page-level search; from `md` the top bar's search does this. */
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  category: CategoryFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

const PORTAL_SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "Most used first" },
  { value: "az", label: "A to Z" },
  { value: "fee", label: "Lowest fee" },
];

/**
 * The applicant portal's toolbar: category pills on the left, the sort as a
 * plain text control on the right. No search (the top bar's already finds
 * services), no layout toggle and no counts.
 */
export function PortalServicesToolbar({
  searchTerm,
  onSearchTermChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
}: PortalServicesToolbarProps) {
  return (
    <div className="flex flex-col gap-4.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-3">
      {/* Phone only. A desktop has the search in its top bar, so two fields are
          not shown there. */}
      <label className="flex h-13 items-center gap-3 rounded-full bg-card px-5 text-base text-muted-2 shadow-portal-card md:hidden">
        <Search className="size-5 shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search a service"
          aria-label="Search a service"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-2"
        />
      </label>

      {/* A phone's pills scroll sideways, out to the edge of the screen; a
          desktop's wrap, so every category is on screen at once. */}
      <ToggleGroup
        aria-label="Filter services by category"
        value={[category]}
        onValueChange={(values: string[]) => {
          // Pressing the active pill would clear the group; a category is always chosen.
          const next = values[0] as CategoryFilter | undefined;
          if (next) onCategoryChange(next);
        }}
        variant="chips"
        className="[--tg-h:calc(var(--spacing)*10.5)] max-md:-mx-5 max-md:w-auto max-md:flex-nowrap max-md:overflow-x-auto max-md:px-5 max-md:[scrollbar-width:none] md:gap-2.5 md:[--tg-h:calc(var(--spacing)*12)]"
      >
        {CATEGORY_FILTERS.map((filter) => (
          <ToggleGroupItem
            key={filter.value}
            value={filter.value}
            className="civic-press border-transparent bg-card px-4.5 text-[15px] font-semibold text-portal-ink-2 shadow-portal-card not-data-pressed:hover:bg-primary-tint data-pressed:border-transparent data-pressed:bg-primary-fill data-pressed:text-white data-pressed:shadow-[0_6px_16px_rgba(11,77,162,0.25)] md:px-5.5 md:text-base"
          >
            <span className="sm:hidden">{filter.shortLabel}</span>
            <span className="hidden sm:inline">{filter.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Select
        items={PORTAL_SORT_OPTIONS}
        value={sort}
        onValueChange={(value) => onSortChange(value as SortOption)}
      >
        <SelectTrigger
          aria-label="Sort services"
          className="gap-1.5 border-0 max-md:hidden bg-transparent px-2 text-[15px] text-muted-foreground shadow-none hover:text-foreground data-[size=default]:h-10"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            {PORTAL_SORT_OPTIONS.map((option) => (
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
