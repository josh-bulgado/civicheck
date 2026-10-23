import type { ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type SortableColumn = {
  toggleSorting: (desc: boolean) => void;
  getIsSorted: () => false | string;
};

/** Sentence-case sort header used by the admin registries and the request tables. */
export function SortHeader({
  column,
  children,
  align = "start",
}: {
  column: SortableColumn;
  children: ReactNode;
  align?: "start" | "end";
}) {
  return (
    <div className={cn("flex", align === "end" && "justify-end")}>
      <Button
        variant="ghost"
        size="sm"
        className="px-0 text-xs font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {children}
        <ArrowUpDown aria-hidden="true" data-icon="inline-end" />
      </Button>
    </div>
  );
}
