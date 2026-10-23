import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/components/ui/card";
import { formatCount } from "~/features/admin/overview/overview-formatters";
import {
  LONG_WAIT_LABEL,
  type LongWait,
} from "~/features/admin/overview/overview-metrics";
import { getStatusDetails } from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";

/** Below xl the column is not height-bound, so it names this many at most. */
const STACKED_LIMIT = 5;

interface StepInStripProps {
  /** The longest waits, longest first. */
  longest: LongWait[];
  /** Every long wait, so the strip can say how many it leaves out. */
  total: number;
}

/**
 * Where the administrator steps in. Admins seldom work requests, but they can
 * override one, so this names the requests that have waited longest on staff
 * and opens each one. It is a column beside the journey, so the longest waits
 * stay on screen next to the stage counts.
 */
export function StepInStrip({ longest, total }: StepInStripProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // How many rows fit the column's height. Null until measured.
  const [fit, setFit] = useState<number | null>(null);

  // The column is as tall as the journey and responsibilities beside it, so the
  // list is clipped to that height and a row shows only if it fits whole.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const list = listRef.current;
    if (!frame || !list) return;

    const measure = () => {
      let shown = 0;
      for (const row of Array.from(list.children) as HTMLElement[]) {
        if (row.offsetParent === null) continue; // not displayed at this width
        if (row.offsetTop + row.offsetHeight > frame.clientHeight) break;
        shown += 1;
      }
      setFit(shown);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(list);
    return () => observer.disconnect();
  }, [longest]);

  const shown = fit ?? Math.min(longest.length, STACKED_LIMIT);
  const hidden = total - shown;

  return (
    <section aria-labelledby="step-in-heading" className="flex flex-1 flex-col">
      <Card variant="quiet" size="sm" className="flex-1">
        <CardHeader>
          <h2 id="step-in-heading" className="text-balance text-xl font-bold tracking-tight">
            Step In ·{" "}
            {total === 0
              ? `Nothing Waiting ${LONG_WAIT_LABEL}`
              : `${formatCount(total)} Waiting ${LONG_WAIT_LABEL}`}
          </h2>
          {total > 0 ? (
            <CardDescription>Open one to review it or override a decision.</CardDescription>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3">
          {total === 0 ? (
            <Alert variant="success" className="civic-enter-sm">
              <CheckCircle2 aria-hidden="true" />
              <AlertTitle>The Office Is Keeping Up</AlertTitle>
              <AlertDescription>
                No request has waited on staff for {LONG_WAIT_LABEL}.
              </AlertDescription>
            </Alert>
          ) : (
            <div ref={frameRef} className="relative min-h-0 flex-1 xl:min-h-52">
              {/* One shared days column, so the services line up across rows. Rows
                  that do not fit stay laid out but invisible, so the measure can
                  count them again when the column grows. */}
              <ul
                ref={listRef}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)] content-start gap-2 xl:absolute xl:inset-0 xl:overflow-hidden",
                  fit === null && "invisible",
                )}
              >
                {longest.map((wait, index) => (
                  <li
                    key={wait.id}
                    className={cn(
                      "col-span-2 grid grid-cols-subgrid",
                      index >= STACKED_LIMIT && "max-xl:hidden",
                      index >= shown && "invisible",
                    )}
                  >
                    <Link
                      to="/requests/$requestId"
                      params={{ requestId: wait.id }}
                      className="group/step civic-interactive col-span-2 grid grid-cols-subgrid items-center gap-x-4 rounded-2xl bg-tone-danger-soft/60 px-4 py-3 outline-none transition-colors hover:bg-tone-danger-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span className="flex flex-col text-3xl leading-none font-extrabold tracking-tight text-destructive tabular-nums">
                        {formatCount(wait.days)}
                        <span className="mt-1 text-sm font-semibold">days</span>
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-mono text-sm">{wait.trackingNumber}</span>
                        <span className="line-clamp-2 text-sm text-pretty text-muted-foreground">
                          {wait.serviceName}
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2">
                          <Badge variant="outline" className="bg-card/70">
                            {getStatusDetails(wait.status).label}
                          </Badge>
                          <ArrowUpRight
                            className="size-4.5 text-destructive/60 transition-[transform,color] group-hover/step:text-destructive motion-safe:group-hover/step:translate-x-0.5 motion-safe:group-hover/step:-translate-y-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hidden > 0 ? (
            <Link
              to="/requests"
              search={{ needs: true }}
              className="civic-nudge mt-auto inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-1.5 text-base font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              + {formatCount(hidden)} More in the Request Queue
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
