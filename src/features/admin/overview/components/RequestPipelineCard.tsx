import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  FileClock,
  FileSearch,
  ListChecks,
  TicketCheck,
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
import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";
import { STAGES } from "~/features/requests/request-queue";
import type { RequestOverview } from "~/features/admin/overview/overview.types";

const STAGE_DETAILS = {
  1: { description: "Awaiting intake review", icon: FileClock },
  2: { description: "Validation and follow-up", icon: FileSearch },
  3: { description: "Documents in processing", icon: ListChecks },
  4: { description: "Ready for release", icon: TicketCheck },
} as const;

export function RequestPipelineCard({
  requests,
}: {
  requests: RequestOverview;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2
            className="scroll-mt-24 text-balance"
            id="request-pipeline-heading"
          >
            Open Request Pipeline
          </h2>
        </CardTitle>
        <CardDescription>
          Active requests grouped by their current CCRO workflow stage.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">
            <CountUp value={requests.openTotal} /> Total
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {requests.openTotal === 0 ? (
          <Alert className="civic-enter-sm">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>The Request Pipeline Is Clear</AlertTitle>
            <AlertDescription>
              New requests will appear here as soon as they are submitted.
            </AlertDescription>
          </Alert>
        ) : null}

        <ol
          aria-labelledby="request-pipeline-heading"
          className="civic-stagger grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
        >
          {requests.stages.map((stage, index) => (
            <li key={stage.stage} style={staggerStyle(index)} className="min-w-0">
              <WorkflowStageCard stage={stage} />
            </li>
          ))}
        </ol>
      </CardContent>
      <CardFooter className="justify-end">
        <Link
          to="/requests"
          search={{}}
          className={buttonVariants({ variant: "ghost" })}
        >
          Open Full Request Queue
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}

function WorkflowStageCard({
  stage,
}: {
  stage: RequestOverview["stages"][number];
}) {
  const detail = STAGE_DETAILS[stage.stage];
  const Icon = detail.icon;

  return (
    <Card className="civic-interactive civic-lift h-full" size="sm">
      <CardHeader>
        <CardTitle>
          <h3 className="text-balance">{stage.label}</h3>
        </CardTitle>
        <CardDescription>
          Stage {stage.stage} of {STAGES.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <span className="text-3xl font-extrabold tracking-tight tabular-nums">
            <CountUp value={stage.count} />
          </span>
          <Icon className="size-5 text-primary" aria-hidden="true" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {detail.description}
        </p>
      </CardContent>
      <CardFooter className="mt-auto justify-end">
        <Link
          to="/requests"
          search={{ stage: stage.stage }}
          className={buttonVariants({ variant: "ghost", size: "xs" })}
        >
          View Stage
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
