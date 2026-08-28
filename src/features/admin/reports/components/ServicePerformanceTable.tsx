import { Link } from "@tanstack/react-router";
import { ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { shareOf } from "~/features/admin/reports/service-report";
import type { ServiceReportRow } from "~/features/admin/reports/service-report.queries";
import { cn } from "~/lib/utils";

const numberFormatter = new Intl.NumberFormat("en-PH");

type SortKey = "label" | "total" | "avgReleaseDays" | "incomplete" | "pending";

const COLUMNS: Array<{
  key: SortKey;
  header: string;
  numeric: boolean;
  hint?: string;
}> = [
  { key: "label", header: "Service", numeric: false },
  { key: "total", header: "Requests", numeric: true },
  { key: "avgReleaseDays", header: "Avg. days to release", numeric: true },
  { key: "incomplete", header: "Incomplete", numeric: true },
  { key: "pending", header: "In pipeline", numeric: true },
];

/**
 * Per-service operational figures on the demand axis — how much of each service
 * the office handled, how long it took, and how often it needed a completeness
 * follow-up.
 *
 * This is what the office-wide cards cannot show: a 20% incomplete rate means
 * something very different if it is concentrated in one service.
 */
export function ServicePerformanceTable({
  services,
  totalRequests,
}: {
  services: ServiceReportRow[];
  totalRequests: number;
}) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "total",
    desc: true,
  });

  const rows = useMemo(() => {
    const sorted = [...services].sort((a, b) => {
      if (sort.key === "label") return a.label.localeCompare(b.label);
      // Services with no releases yet sort last either way rather than being
      // treated as "0 days", which would read as instant turnaround.
      const left = a[sort.key] ?? Number.NEGATIVE_INFINITY;
      const right = b[sort.key] ?? Number.NEGATIVE_INFINITY;
      return Number(left) - Number(right);
    });
    return sort.desc ? sorted.reverse() : sorted;
  }, [services, sort]);

  if (services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Service Performance</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="civic-enter-sm">
            <AlertTitle>No Requests in This Period</AlertTitle>
            <AlertDescription>
              Per-service figures appear once requests have been submitted.
              Try widening the reporting period.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Service Performance</h2>
        </CardTitle>
        <CardDescription>
          Demand and turnaround for each service in this period. Case variants
          are combined, so all delayed-birth tracks count as one service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(column.numeric && "text-right")}
                    aria-sort={
                      sort.key === column.key
                        ? sort.desc
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "-mx-2 h-8 font-semibold",
                        column.numeric && "ml-auto",
                      )}
                      onClick={() =>
                        setSort((current) =>
                          current.key === column.key
                            ? { key: column.key, desc: !current.desc }
                            : { key: column.key, desc: column.key !== "label" },
                        )
                      }
                    >
                      {column.header}
                      <ArrowUpDown
                        data-icon="inline-end"
                        aria-hidden="true"
                        className={cn(
                          "size-3.5",
                          sort.key === column.key
                            ? "opacity-100"
                            : "opacity-40",
                        )}
                      />
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const share = shareOf(row.total, totalRequests);
                const incompleteRate = shareOf(row.incomplete, row.total);

                return (
                  <TableRow key={row.key}>
                    <TableCell className="max-w-80">
                      <Link
                        to="/requests"
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {row.label}
                      </Link>
                      {row.departmentId ? (
                        <span className="mt-1 block text-xs capitalize text-muted-foreground">
                          {row.departmentId} department
                        </span>
                      ) : null}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      <span className="font-semibold">
                        {numberFormatter.format(row.total)}
                      </span>
                      {share !== null ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {share}%
                        </span>
                      ) : null}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {row.avgReleaseDays !== null ? (
                        <>
                          <span className="font-semibold">
                            {row.avgReleaseDays}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            n={row.releaseSample}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {row.incomplete > 0 ? (
                        <Badge variant="secondary">
                          {numberFormatter.format(row.incomplete)}
                          {incompleteRate !== null ? ` · ${incompleteRate}%` : ""}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-semibold tabular-nums">
                      {numberFormatter.format(row.pending)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
