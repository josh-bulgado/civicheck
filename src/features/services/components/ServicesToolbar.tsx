import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from "~/features/services/service-utils";

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

interface ServicesToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  category: CategoryFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  totalCount: number;
}

export function ServicesToolbar({
  searchTerm,
  onSearchTermChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
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
