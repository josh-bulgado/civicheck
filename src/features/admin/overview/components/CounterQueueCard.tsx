import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  TicketCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { formatCount } from "~/features/admin/overview/overview-formatters";
import type { QueueOverview } from "~/features/admin/overview/overview.types";
import { laneLabel } from "~/features/queue/queue.types";

export function CounterQueueCard({ queue }: { queue: QueueOverview }) {
  const queueTotal = queue.waiting + queue.active;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-balance">Today&apos;s Counter Queue</h2>
        </CardTitle>
        <CardDescription>
          Citizens waiting or being served across all counter lanes.
        </CardDescription>
        <CardAction>
          <Badge variant={queueTotal > 0 ? "default" : "secondary"}>
            Live Today
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-3">
          <QueueMetric icon={UsersRound} label="Waiting" value={queue.waiting} />
          <QueueMetric
            icon={TicketCheck}
            label="Called or Serving"
            value={queue.active}
          />
        </dl>

        {queue.waiting === 0 ? (
          <Alert>
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>No Citizens Waiting</AlertTitle>
            <AlertDescription>
              The active counter queue is clear right now.
            </AlertDescription>
          </Alert>
        ) : (
          <LaneBreakdown waitingByLane={queue.waitingByLane} />
        )}

        <p className="text-xs text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {formatCount(queue.servedToday)}
          </span>{" "}
          served today
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Link
          to="/queue"
          className={buttonVariants({ variant: "ghost" })}
        >
          Open Queue Desk
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}

interface QueueMetricProps {
  icon: LucideIcon;
  label: string;
  value: number;
}

function QueueMetric({ icon: Icon, label, value }: QueueMetricProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-4">
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <dt className="mt-3 text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
        {formatCount(value)}
      </dd>
    </div>
  );
}

function LaneBreakdown({
  waitingByLane,
}: {
  waitingByLane: QueueOverview["waitingByLane"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
        Waiting by Lane
      </p>
      <ul className="flex flex-col gap-2">
        {Object.entries(waitingByLane).map(([lane, count]) => (
          <li
            key={lane}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
          >
            <span className="min-w-0 truncate text-sm">{laneLabel(lane)}</span>
            <Badge variant="secondary">{formatCount(count)}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
