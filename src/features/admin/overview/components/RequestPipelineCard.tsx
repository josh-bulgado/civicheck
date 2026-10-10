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
import { cn } from "~/lib/utils";
import { STAGES } from "~/features/requests/request-queue";
import type { RequestOverview } from "~/features/admin/overview/overview.types";

type StageSummary = RequestOverview["stages"][number];

/**
 * `tone` darkens with the workflow so the distribution bar reads as a
 * progression. Each card repeats its tone as a dot beside its label, and every
 * figure is also printed as text, so colour is never the only carrier.
 */
const STAGE_DETAILS = {
  1: {
    description: "Awaiting intake review",
    icon: FileClock,
    tone: "bg-primary/25",
  },
  2: {
    description: "Validation and follow-up",
    icon: FileSearch,
    tone: "bg-primary/45",
  },
  3: {
    description: "Documents in processing",
    icon: ListChecks,
    tone: "bg-primary/70",
  },
  4: {
    description: "Ready for release",
    icon: TicketCheck,
    tone: "bg-primary",
  },
} as const;

function pluralizeRequests(count: number) {
  return count === 1 ? "request" : "requests";
}

export function RequestPipelineCard({
  requests,
}: {
  requests: RequestOverview;
}) {
  const isClear = requests.openTotal === 0;

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
            <CountUp value={requests.openTotal} /> Open
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {isClear ? (
          <Alert variant="success" className="civic-enter-sm">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>The Request Pipeline Is Clear</AlertTitle>
            <AlertDescription>
              New requests will appear here as soon as they are submitted.
            </AlertDescription>
          </Alert>
        ) : (
          <StageDistributionBar stages={requests.stages} />
        )}

        <ol
          aria-labelledby="request-pipeline-heading"
          className="civic-stagger grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {requests.stages.map((stage, index) => (
            <li key={stage.stage} style={staggerStyle(index)} className="min-w-0">
              <WorkflowStageCard stage={stage} openTotal={requests.openTotal} />
            </li>
          ))}
        </ol>
      </CardContent>
      <CardFooter className="justify-end">
        <Link
          to="/requests"
          search={{}}
          className={cn(buttonVariants({ variant: "ghost" }), "civic-nudge")}
        >
          Open Full Request Queue
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}

/**
 * One segment per non-empty stage, sized by its share of open requests. It is
 * a glanceable summary only — the stage cards below carry the real numbers —
 * so it is hidden from assistive tech rather than announced twice.
 */
function StageDistributionBar({ stages }: { stages: StageSummary[] }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
    >
      {stages
        .filter((stage) => stage.count > 0)
        .map((stage) => (
          <span
            key={stage.stage}
            className={cn("h-full min-w-1 basis-0", STAGE_DETAILS[stage.stage].tone)}
            style={{ flexGrow: stage.count }}
          />
        ))}
    </div>
  );
}

function WorkflowStageCard({
  stage,
  openTotal,
}: {
  stage: StageSummary;
  openTotal: number;
}) {
  const detail = STAGE_DETAILS[stage.stage];
  const Icon = detail.icon;
  const isEmpty = stage.count === 0;
  const share = openTotal > 0 ? Math.round((stage.count / openTotal) * 100) : 0;

  return (
    <Card
      className="civic-interactive civic-lift relative h-full has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring"
      size="sm"
    >
      <CardHeader>
        <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
          <span
            className={cn("size-1.5 shrink-0 rounded-full", detail.tone)}
            aria-hidden="true"
          />
          Stage {stage.stage} of {STAGES.length}
        </CardDescription>
        <CardTitle>
          <h3 className="text-balance">{stage.label}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "text-3xl leading-none font-extrabold tracking-tight tabular-nums",
                isEmpty && "text-muted-foreground",
              )}
            >
              <CountUp value={stage.count} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pluralizeRequests(stage.count)}
              {isEmpty ? null : ` · ${share}% of open`}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{detail.description}</p>
      </CardContent>
      <CardFooter className="mt-auto justify-end">
        {/* Stretched link: the ::after covers the whole card, so the entire
            tile is the click/tap target rather than just this small button. */}
        <Link
          to="/requests"
          search={{ stage: stage.stage }}
          className={cn(
            buttonVariants({ variant: "ghost", size: "xs" }),
            "civic-nudge after:absolute after:inset-0 after:content-['']",
          )}
        >
          View Stage
          <span className="sr-only"> {stage.label}</span>
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
