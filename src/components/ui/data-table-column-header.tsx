import { ArrowUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";

/** Click-to-sort column header shared by the TanStack data tables. */
export function SortableHeader({
  column,
  label,
}: {
  column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | string };
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-transparent"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-1 w-3 h-3" />
    </Button>
  );
}
