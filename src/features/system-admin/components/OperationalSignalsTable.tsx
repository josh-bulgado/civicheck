import { Archive, FileClock, ServerCog } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { OperationalSignal } from "../system-admin.types";
import { formatHealthCount } from "../system-health.utils";
import { HealthStatusBadge } from "./HealthStatusBadge";

const signalIcons = {
  jobs: ServerCog,
  storage: Archive,
  workflow: FileClock,
} as const;

export function OperationalSignalsTable({
  signals,
}: {
  signals: OperationalSignal[];
}) {
  return (
    <section aria-labelledby="signals-title">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id="signals-title" className="scroll-mt-6">
              Bottlenecks &amp; Queues
            </h2>
          </CardTitle>
          <CardDescription>
            Queue backlog, failed jobs, storage capacity, and stalled workflow
            records. All readings exclude protected case content.
          </CardDescription>
          <CardAction>
            <Badge variant="outline" className="tabular-nums">
              {formatHealthCount(signals.length)} signals
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ScrollArea>
            <Table>
              <TableCaption className="sr-only">
                Current operational signal readings and status
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Signal</TableHead>
                  <TableHead scope="col">Current Reading</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Operational Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.length > 0 ? (
                  signals.map((signal) => {
                    const Icon = signalIcons[signal.key];

                    return (
                      <TableRow key={signal.key}>
                        <TableCell>
                          <span className="flex items-center gap-2 font-medium">
                            <Icon
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            {signal.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          {signal.value}
                        </TableCell>
                        <TableCell>
                          <HealthStatusBadge status={signal.status} />
                        </TableCell>
                        <TableCell className="max-w-lg whitespace-normal text-muted-foreground">
                          {signal.detail}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No operational signal readings are available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  );
}
