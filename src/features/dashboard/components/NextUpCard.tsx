import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Kbd } from "~/components/ui/kbd";
import { StageStatus } from "~/features/dashboard/components/StageStatus";
import { WAIT_TONE_BADGE } from "~/features/dashboard/components/WaitPill";
import type { DeskRequest } from "~/features/dashboard/staff-desk";
import { formatCount } from "~/features/admin/overview/overview-formatters";
import type { WaitTone } from "~/features/requests/requests-table.utils";
import { cn } from "~/lib/utils";

/** The card's wash and the big number's colour for each wait tone. */
const TONE_STYLES: Record<WaitTone, { wash: string; number: string }> = {
  critical: { wash: "bg-linear-to-b from-tone-danger-soft/70 to-card to-75%", number: "text-destructive" },
  warning: { wash: "bg-linear-to-b from-tone-warning-soft/70 to-card to-75%", number: "text-tone-warning" },
  normal: { wash: "", number: "text-foreground" },
  quiet: { wash: "", number: "text-foreground" },
};

interface NextUpCardProps {
  /** The request that has waited longest on staff, or null if nothing is waiting. */
  request: DeskRequest | null;
  /** Every request waiting on staff, so the card can offer the rest. */
  total: number;
}

/**
 * The one request to take next: the longest wait on staff. Staff work a request
 * at a time and requests are not assigned, so the dashboard answers "what is
 * next?" before anything else, and Enter opens it.
 */
export function NextUpCard({ request, total }: NextUpCardProps) {
  const navigate = useNavigate();
  const requestId = request?.id;

  useEffect(() => {
    if (!requestId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      // Only when nothing has focus and nothing is open over the page, so Enter
      // still presses a focused button and still submits a dialog.
      if (document.activeElement !== document.body) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      event.preventDefault();
      void navigate({ to: "/requests/$requestId", params: { requestId } });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigate, requestId]);

  if (!request) {
    return (
      <Card variant="lifted" className="justify-center">
        <CardContent>
          <Alert variant="success" className="civic-enter-sm">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>Nothing Is Waiting on You</AlertTitle>
            <AlertDescription>
              New requests appear here as soon as they are submitted.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const tone = TONE_STYLES[request.tone];

  return (
    <Card variant="lifted" className={cn("justify-between", tone.wash)}>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={WAIT_TONE_BADGE[request.tone]} className="h-6 text-sm">
          Longest Wait on You
        </Badge>
        <StageStatus request={request} className="text-muted-foreground" />
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <p
          className={cn(
            "text-7xl leading-none font-extrabold tracking-tighter tabular-nums sm:text-8xl",
            tone.number,
          )}
        >
          <span aria-hidden="true">{request.wait.value}</span>
          <span aria-hidden="true" className="ml-2 text-xl font-semibold tracking-normal">
            {request.wait.unit} waiting
          </span>
          <span className="sr-only">Waiting {request.wait.spoken}</span>
        </p>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-mono text-base font-medium">{request.trackingNumber}</span>
          <span className="text-xl font-semibold tracking-tight text-balance">
            {request.applicantName}
          </span>
          <span className="text-sm text-pretty text-muted-foreground">{request.serviceName}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            to="/requests/$requestId"
            params={{ requestId: request.id }}
            className={buttonVariants({ variant: "raised", size: "lg" })}
          >
            Open Request
            <Kbd className="bg-white/20 text-primary-foreground" aria-hidden="true">
              ↵
            </Kbd>
          </Link>
          {total > 1 ? (
            <Link
              to="/requests"
              search={{ needs: true }}
              className="civic-nudge inline-flex min-h-11 items-center gap-2 rounded-lg px-1.5 text-base font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              See All {formatCount(total)} That Need You
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
