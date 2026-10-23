import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { formatCount } from "~/features/admin/overview/overview-formatters";
import {
  LONG_WAIT_LABEL,
  type LongWait,
} from "~/features/admin/overview/overview-metrics";
import { getStatusDetails } from "~/features/requests/request-workflow";

interface StepInStripProps {
  /** The longest waits, longest first. */
  longest: LongWait[];
  /** Every long wait, so the strip can say how many it leaves out. */
  total: number;
}

/**
 * Where the administrator steps in. Admins seldom work requests, but they can
 * override one, so this names the requests that have waited longest on staff
 * and opens each one.
 */
export function StepInStrip({ longest, total }: StepInStripProps) {
  const hidden = total - longest.length;

  return (
    <section aria-labelledby="step-in-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="step-in-heading" className="text-balance text-xl font-bold tracking-tight">
          Step In ·{" "}
          {total === 0
            ? `Nothing Waiting ${LONG_WAIT_LABEL}`
            : `${formatCount(total)} Waiting ${LONG_WAIT_LABEL}`}
        </h2>
        {total > 0 ? (
          <p className="text-sm text-muted-foreground">
            Open one to review it or override a decision.
          </p>
        ) : null}
      </div>

      {total === 0 ? (
        <Alert variant="success" className="civic-enter-sm">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>The Office Is Keeping Up</AlertTitle>
          <AlertDescription>
            No request has waited on staff for {LONG_WAIT_LABEL}.
          </AlertDescription>
        </Alert>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {longest.map((wait) => (
            <li key={wait.id} className="min-w-0">
              <Link
                to="/requests/$requestId"
                params={{ requestId: wait.id }}
                className="civic-interactive civic-lift flex h-full flex-col gap-1.5 rounded-2xl bg-destructive/10 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-3xl leading-none font-extrabold tracking-tight text-destructive tabular-nums">
                  {formatCount(wait.days)}
                  <span className="text-lg font-semibold">&nbsp;days</span>
                </span>
                <span className="font-mono text-sm">{wait.trackingNumber}</span>
                <span className="text-sm text-pretty text-muted-foreground">
                  {wait.serviceName} · {getStatusDetails(wait.status).label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 ? (
        <Link
          to="/requests"
          search={{ needs: true }}
          className="civic-nudge inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-1.5 text-base font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          + {formatCount(hidden)} More in the Request Queue
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
