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
import { cn } from "~/lib/utils";

export function TelemetrySourcesDisclosure() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="dashboard-panel overflow-hidden"
    >
      <CollapsibleTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-between rounded-none px-5 py-4 whitespace-normal sm:px-6"
          />
        }
      >
        <span>Telemetry Sources &amp; Privacy Boundary</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {open ? "Hide details" : "Show details"}
          <ChevronDown
            data-icon="inline-end"
            className={cn("transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-5 py-5 sm:px-6">
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
      </CollapsibleContent>
    </Collapsible>
  );
}
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
