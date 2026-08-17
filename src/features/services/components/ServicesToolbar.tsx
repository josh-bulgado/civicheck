import type { ComponentType, ReactNode } from "react";
import { LayoutGrid, Rows3, Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
  totalCount: number;
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
  totalCount,
}: ServicesToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Search a service or document"
          className="h-12 rounded-[10px] border-control-border pl-11 text-base"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <PillButton
            active={category === "all"}
            onClick={() => onCategoryChange("all")}
          >
            All {totalCount}
          </PillButton>
          {CATEGORY_FILTERS.map((filter) => (
            <PillButton
              key={filter.value}
              active={category === filter.value}
              onClick={() => onCategoryChange(filter.value)}
            >
              {filter.label}
            </PillButton>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div
            role="group"
            aria-label="Service layout"
            className="flex items-center gap-1 rounded-lg border border-control-border bg-white p-1"
          >
            {VIEW_OPTIONS.map((option) => (
              <ViewButton
                key={option.value}
                active={view === option.value}
                hint={option.hint}
                onClick={() => onViewChange(option.value)}
              >
                <option.icon className="size-4" aria-hidden="true" />
                {option.label}
              </ViewButton>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[15px] text-muted-foreground">Sort</span>
            <Select value={sort} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger className="h-9 rounded-lg border-control-border text-[15px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="az">A–Z</SelectItem>
                <SelectItem value="fee">Lowest fee first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  hint,
  onClick,
  children,
}: {
  active: boolean;
  hint: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={
        active
          ? "civic-press inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-[14px] font-bold text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          : "civic-press inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[14px] font-bold text-muted-foreground outline-none transition-colors hover:bg-surface-subtle hover:text-body-strong focus-visible:ring-3 focus-visible:ring-ring/50"
      }
    >
      {children}
    </button>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-[15px] font-bold text-white"
          : "whitespace-nowrap rounded-full border border-control-border bg-white px-4 py-2 text-[15px] text-body-strong transition-colors hover:bg-surface-subtle"
      }
    >
      {children}
    </button>
  );
}
