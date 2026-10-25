import { Skeleton } from "~/components/ui/skeleton";
import { TableCell, TableRow } from "~/components/ui/table";

export function AuditTableSkeleton() {
  return Array.from({ length: 5 }, (_, index) => (
    <TableRow
      key={index}
      aria-hidden="true"
      className="h-[76px] border-border-lighter hover:bg-transparent"
    >
      <TableCell className="px-6 py-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-3 w-20" />
      </TableCell>
      <TableCell className="px-6 py-3">
        <Skeleton className="h-6 w-16 rounded-full" />
      </TableCell>
      <TableCell className="px-6 py-3">
        <Skeleton className="h-4 w-40 max-w-full" />
      </TableCell>
      <TableCell className="px-6 py-3">
        <Skeleton className="h-4 w-44 max-w-full" />
      </TableCell>
      <TableCell className="px-6 py-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-24" />
      </TableCell>
    </TableRow>
  ));
}
