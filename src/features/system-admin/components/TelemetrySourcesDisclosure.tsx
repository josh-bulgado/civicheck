import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { healthDataSources } from "../system-health.constants";

export function TelemetrySourcesDisclosure() {
  return (
    <details className="dashboard-panel group overflow-hidden">
      <summary className="flex touch-manipulation cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-bold text-foreground transition-[background-color] duration-200 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6">
        <span>Telemetry Sources &amp; Privacy Boundary</span>
        <span className="text-xs font-semibold text-primary group-open:hidden">
          Show Details
        </span>
        <span className="hidden text-xs font-semibold text-primary group-open:inline">
          Hide Details
        </span>
      </summary>
      <div className="border-t border-border px-5 py-5 sm:px-6">
        <p className="max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">
          Health records contain operational metadata only. This dashboard does
          not query or store citizen form values, document paths, file names,
          request remarks, or authentication secrets.
        </p>
        <div className="mt-5">
          <Table>
            <TableCaption className="sr-only">
              Telemetry sources, owners, update schedules, and privacy limits
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Signal</TableHead>
                <TableHead scope="col">Source</TableHead>
                <TableHead scope="col">Update</TableHead>
                <TableHead scope="col">Owner</TableHead>
                <TableHead scope="col">Acceptable Exposure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {healthDataSources.map((source) => (
                <TableRow key={source.signal}>
                  <TableCell className="font-medium">{source.signal}</TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-pretty text-muted-foreground">
                    {source.source}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {source.refresh}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {source.owner}
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-pretty text-muted-foreground">
                    {source.exposure}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </details>
  );
}
