import { Skeleton } from "~/components/ui/skeleton";
import { TableCell, TableRow } from "~/components/ui/table";
import type { AccountCategory } from "../system-admin.types";

export function AccountsTableSkeleton({
  category,
}: {
  category: AccountCategory;
}) {
  const columns = category === "personnel" ? 6 : 4;
  return Array.from({ length: 6 }, (_, index) => (
    <TableRow
      key={index}
      aria-hidden="true"
      data-accounts-skeleton
      className="h-[68px] border-border-lighter hover:bg-transparent"
    >
      <TableCell className="px-6 py-3">
        <div className="flex items-center gap-3.5">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32 max-w-full" />
            <Skeleton className="h-3 w-44 max-w-full" />
          </div>
        </div>
      </TableCell>
      {Array.from({ length: columns - 1 }, (_, column) => (
        <TableCell key={column} className="px-6 py-3">
          <Skeleton
            className={
              column === columns - 2 ? "ml-auto h-4 w-6" : "h-4 w-24 max-w-full"
            }
          />
        </TableCell>
      ))}
    </TableRow>
  ));
}
