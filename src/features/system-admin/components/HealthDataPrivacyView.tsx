import type { ReactNode } from "react";
import { Check, KeyRound, SlidersHorizontal, X, type LucideIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Kbd } from "~/components/ui/kbd";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { privacyBoundary } from "../system-health.constants";
import { formatBytes, formatHealthClock, formatResponseTime } from "../system-health.utils";
import type { HealthSource, SystemHealthDashboard } from "../system-admin.types";

function BoundaryList({
  title,
  items,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  items: readonly string[];
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <section className="flex flex-col gap-2.5 px-5 py-1 md:border-l md:border-border/60 md:first:border-l-0 md:first:pl-0">
      <h3 className="text-base font-bold">{title}</h3>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-pretty text-muted-foreground">
            <Icon className={`mt-0.5 size-4 shrink-0 ${iconClassName}`} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

type SourceRow = { key: string; name: string; source: HealthSource; lastWrite: string | null };

function sourceRows(data: SystemHealthDashboard): SourceRow[] {
  return [
    ...data.services.map((s) => ({ key: s.key, name: s.name, source: s.source, lastWrite: s.lastCheckedAt })),
    { key: "capacity", name: data.capacity.name, source: data.capacity.source, lastWrite: data.capacity.lastCheckedAt },
    { key: "monitor", name: data.monitor.name, source: data.monitor.source, lastWrite: data.monitor.lastRunAt },
  ];
}

function LimitRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3 text-sm">
      <span>{label}</span>
      <span className="font-mono text-base font-semibold tabular-nums">{value}</span>
    </li>
  );
}

/** The Privacy Boundary, where each number comes from, and the limits. Always open, never folded away. */
export function HealthDataPrivacyView({
  data,
  hotkeyLabel,
  onEditLimits,
}: {
  data: SystemHealthDashboard;
  hotkeyLabel: (hotkey: string) => string;
  onEditLimits: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card variant="quiet" size="sm">
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-bold">Privacy Boundary</h2>
          </CardTitle>
          <CardDescription>What this page records, what it never does, and who can see it.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3 md:gap-0">
          <BoundaryList title="Recorded" items={privacyBoundary.recorded} icon={Check} iconClassName="text-health-success-dot" />
          <BoundaryList title="Never Recorded" items={privacyBoundary.never} icon={X} iconClassName="text-health-error-dot" />
          <BoundaryList title="Who Sees It, and for How Long" items={privacyBoundary.access} icon={KeyRound} iconClassName="text-primary" />
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card variant="quiet" size="sm" className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle>
              <h2 className="text-lg font-bold">Where Each Number Comes From</h2>
            </CardTitle>
            <CardDescription>One row per component. A new component appears here without a code change.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="pl-5">Component</TableHead>
                  <TableHead scope="col">Measured by</TableHead>
                  <TableHead scope="col">Updates</TableHead>
                  <TableHead scope="col">Exposure</TableHead>
                  <TableHead scope="col" className="pr-5">Last write</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourceRows(data).map(({ key, name, source, lastWrite }) => (
                  <TableRow key={key}>
                    <TableCell className="pl-5 font-semibold whitespace-normal">{name}</TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-pretty text-muted-foreground">{source.measuredBy}</TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">{source.updates}</TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-pretty text-muted-foreground">{source.exposure}</TableCell>
                    <TableCell className="pr-5 font-mono tabular-nums">{lastWrite ? formatHealthClock(lastWrite) : "Never"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card variant="quiet" size="sm" className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle>
              <h2 className="text-lg font-bold">Check Limits</h2>
            </CardTitle>
            <CardDescription>A check slower than its limit counts as slow.</CardDescription>
            {data.canManage ? (
              <CardAction>
                <Button type="button" variant="outline" size="sm" onClick={onEditLimits}>
                  <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
                  Edit Limits
                  <Kbd aria-hidden="true">{hotkeyLabel("E")}</Kbd>
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="px-0">
            <ul>
              {data.services.map((service) => (
                <LimitRow key={service.key} label={service.name} value={formatResponseTime(service.slowAfterMs)} />
              ))}
              <LimitRow
                label="Storage capacity"
                value={data.capacity.capacityBytes ? formatBytes(data.capacity.capacityBytes) : "Not set"}
              />
            </ul>
            <p className="border-t border-border/60 px-5 py-3 text-sm text-muted-foreground">
              Each change is written to the Audit Center.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
