import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { formatCount } from "~/features/admin/overview/overview-formatters";
import { LONG_WAIT_LABEL } from "~/features/admin/overview/overview-metrics";
import type { DeskStage } from "~/features/dashboard/staff-desk";
import { STAGE_ICONS } from "~/features/requests/stage-icons";
import { STAGE_TONES } from "~/features/requests/stage-tones";
import { cn } from "~/lib/utils";

function describeStage({ count, longWaits, oldest }: DeskStage) {
  if (count === 0) return "Nothing here";
  if (!oldest) return "Nothing waiting on you";
  const longest = `oldest ${oldest.short}`;
  return longWaits > 0
    ? `${formatCount(longWaits)} waiting ${LONG_WAIT_LABEL} · ${longest}`
    : `None waiting ${LONG_WAIT_LABEL} · ${longest}`;
}

/** The four stages with what sits in each, so staff see where the work is. */
export function StaffStageCard({ stages, openTotal }: { stages: DeskStage[]; openTotal: number }) {
  return (
    <Card variant="quiet" size="sm" className="gap-0 pb-0">
      <CardHeader className="pb-3">
        <CardTitle>
          <h2 className="text-lg font-bold">Your Queue by Stage</h2>
        </CardTitle>
        <CardDescription>
          {formatCount(openTotal)} open · {LONG_WAIT_LABEL} is overdue
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ol className="flex flex-col divide-y divide-border/60">
          {stages.map((summary) => {
            const tones = STAGE_TONES[summary.stage];
            const Icon = STAGE_ICONS[summary.stage];
            return (
              <li key={summary.stage}>
                <Link
                  to="/requests"
                  search={{ stage: summary.stage }}
                  className="civic-interactive grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl text-background",
                      tones.dot,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-base font-semibold">{summary.label}</span>
                    <span
                      className={cn(
                        "text-sm text-pretty",
                        summary.longWaits > 0 ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {describeStage(summary)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-3xl font-extrabold tracking-tight tabular-nums",
                      summary.count > 0 ? tones.text : "font-semibold text-muted-foreground",
                    )}
                  >
                    {formatCount(summary.count)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
