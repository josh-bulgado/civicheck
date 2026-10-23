import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileClock,
  FileSearch,
  ListChecks,
  TicketCheck,
  type LucideIcon,
} from "lucide-react";
import { CountUp } from "~/components/motion/count-up";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { formatCount } from "~/features/admin/overview/overview-formatters";
import {
  LONG_WAIT_LABEL,
  bubbleRadius,
  type RequestOverview,
  type StageSummary,
} from "~/features/admin/overview/overview-metrics";
import { STAGE_TONES } from "~/features/requests/stage-tones";
import type { WorkflowStage } from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";

// Drawing space for the journey. The SVG scales to its card, so these are
// proportions, not pixels. The four labels under it are a 4-column grid, so
// each bubble sits at the centre of its column.
const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 320;
/** Each bubble's height, so the path rises and dips between the stages. */
const BUBBLE_CENTER_Y: Record<WorkflowStage, number> = {
  1: 170,
  2: 130,
  3: 180,
  4: 140,
};
const JOURNEY_PATH =
  "M0 170 C 250 170, 260 130, 450 130 S 620 180, 750 180 S 900 140, 1050 140 L 1200 140";

const STAGE_ICONS: Record<WorkflowStage, LucideIcon> = {
  1: FileClock,
  2: FileSearch,
  3: ListChecks,
  4: TicketCheck,
};

function describeJourney(requests: RequestOverview) {
  const stages = requests.stages
    .map(
      (stage) =>
        `${stage.label} ${formatCount(stage.count)}` +
        (stage.longWaits > 0
          ? ` (${formatCount(stage.longWaits)} waiting ${LONG_WAIT_LABEL})`
          : ""),
    )
    .join(", ");
  return `Four stages joined by a path, each a bubble sized by its requests: ${stages}.`;
}

export function JourneyCard({ requests }: { requests: RequestOverview }) {
  const fullest = Math.max(0, ...requests.stages.map((stage) => stage.count));
  const spacing = VIEW_WIDTH / requests.stages.length;
  const isClear = requests.openTotal === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-balance text-xl" id="journey-heading">
            Where the {formatCount(requests.openTotal)} Open{" "}
            {requests.openTotal === 1 ? "Request Is" : "Requests Are"} Right Now
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isClear ? (
          <Alert variant="success" className="civic-enter-sm">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>The Desk Is Clear</AlertTitle>
            <AlertDescription>
              New requests appear here as soon as they are submitted.
            </AlertDescription>
          </Alert>
        ) : (
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            role="img"
            aria-label={describeJourney(requests)}
            className="block h-auto w-full"
          >
            <path
              d={JOURNEY_PATH}
              className="fill-none stroke-border-strong stroke-4 [stroke-dasharray:4_12] [stroke-linecap:round]"
            />
            {requests.stages.map((summary, index) => (
              <StageBubble
                key={summary.stage}
                summary={summary}
                cx={spacing * index + spacing / 2}
                radius={bubbleRadius(summary.count, fullest)}
              />
            ))}
          </svg>
        )}

        <ol
          aria-labelledby="journey-heading"
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          {requests.stages.map((summary) => (
            <li key={summary.stage} className="min-w-0">
              <StageLink summary={summary} />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/** One stage: a bubble with its icon, and a red ring and count if any wait is long. */
function StageBubble({
  summary,
  cx,
  radius,
}: {
  summary: StageSummary;
  cx: number;
  radius: number;
}) {
  const tones = STAGE_TONES[summary.stage];
  const Icon = STAGE_ICONS[summary.stage];
  const cy = BUBBLE_CENTER_Y[summary.stage];
  const iconSize = Math.max(29, Math.round(radius * 0.86));
  // The badge sits on the bubble's upper right, wide enough for its digits.
  const badgeRadius = Math.max(19, 9 + 7 * String(summary.longWaits).length);
  const badgeOffset = radius * 0.72 + 6;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={radius + 12}
        className={cn(tones.fill, "opacity-20")}
      />
      <circle cx={cx} cy={cy} r={radius} className={tones.fill} />
      <Icon
        x={cx - iconSize / 2}
        y={cy - iconSize / 2}
        width={iconSize}
        height={iconSize}
        className="text-background"
      />
      {summary.longWaits > 0 ? (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={radius + 18}
            className="fill-none stroke-destructive stroke-[5px] [stroke-dasharray:3_9] [stroke-linecap:round]"
          />
          <circle
            cx={cx + badgeOffset}
            cy={cy - badgeOffset}
            r={badgeRadius}
            className="fill-destructive"
          />
          <text
            x={cx + badgeOffset}
            y={cy - badgeOffset + 8}
            textAnchor="middle"
            className="fill-background text-[22px] font-bold"
          >
            {formatCount(summary.longWaits)}
          </text>
        </>
      ) : null}
    </g>
  );
}

function StageLink({ summary }: { summary: StageSummary }) {
  const tones = STAGE_TONES[summary.stage];
  return (
    <Link
      to="/requests"
      search={{ stage: summary.stage }}
      className="civic-interactive flex h-full flex-col items-center gap-0.5 rounded-xl px-2 py-3 text-center outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-sm text-muted-foreground">
        Stage {summary.stage} of 4
      </span>
      <span className="text-lg font-bold text-balance">{summary.label}</span>
      <span
        className={cn(
          "text-4xl leading-tight font-extrabold tracking-tight tabular-nums",
          tones.text,
        )}
      >
        <CountUp value={summary.count} />
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          summary.longWaits > 0 ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {summary.longWaits > 0
          ? `${formatCount(summary.longWaits)} waiting ${LONG_WAIT_LABEL}`
          : `None waiting ${LONG_WAIT_LABEL}`}
      </span>
    </Link>
  );
}
