// Filtering and export for the Services tab's ledger. Pure, so the table, its
// chips and the CSV all agree on which services a search leaves.

import { ALL_DEPARTMENTS } from "~/features/admin/department-filter";
import { formatDays } from "~/features/admin/reports/report-summary";
import type { ServiceReportRow } from "~/features/admin/reports/service-report.queries";
import { toCsv } from "~/lib/csv";

/** Case-insensitive match on the service's name, its group key or its department. */
export function matchesServiceSearch(
  row: Pick<ServiceReportRow, "label" | "key" | "departmentId">,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [row.label, row.key, row.departmentId ?? ""].some((text) =>
    text.toLowerCase().includes(needle),
  );
}

export function matchesServiceDepartment(
  row: Pick<ServiceReportRow, "departmentId">,
  department: string,
): boolean {
  return department === ALL_DEPARTMENTS || row.departmentId === department;
}

/**
 * Services per department among the rows a search leaves, plus the total under
 * "all". The chips are both the overview and the filter, so a chip never
 * promises more rows than the table will show.
 */
export function countByDepartment(
  rows: ReadonlyArray<Pick<ServiceReportRow, "label" | "key" | "departmentId">>,
  query: string,
): Record<string, number> {
  const counts: Record<string, number> = { [ALL_DEPARTMENTS]: 0 };
  for (const row of rows) {
    if (!matchesServiceSearch(row, query)) continue;
    counts[ALL_DEPARTMENTS] += 1;
    if (row.departmentId) counts[row.departmentId] = (counts[row.departmentId] ?? 0) + 1;
  }
  return counts;
}

export function servicesToCsv(
  rows: ReadonlyArray<ServiceReportRow>,
  departmentName: (departmentId: string | null) => string,
): string {
  return toCsv(
    [
      "Service",
      "Department",
      "Requests",
      "Released",
      "Average days to release",
      "Sent back",
      "Still open",
      "Rejected",
      "Walk-in",
    ],
    rows.map((row) => [
      row.label,
      departmentName(row.departmentId),
      row.total,
      row.released,
      row.avgReleaseDays === null ? "" : formatDays(row.avgReleaseDays),
      row.incomplete,
      row.pending,
      row.rejected,
      row.walkIn,
    ]),
  );
}
