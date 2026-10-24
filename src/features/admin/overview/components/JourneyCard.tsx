import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { CountUp } from "~/components/motion/count-up";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Card,
  CardContent,
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
import { STAGE_ICONS } from "~/features/requests/stage-icons";
import { STAGE_TONES } from "~/features/requests/stage-tones";
import type { WorkflowStage } from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";

// Drawing space for the journey. The SVG scales to its card, so these are
// proportions, not pixels. The four labels under it are a 4-column grid, so
// each bubble sits at the centre of its column.
const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 190;
/** Each bubble's height, so the path rises and dips between the stages. */
const BUBBLE_CENTER_Y: Record<WorkflowStage, number> = {
  1: 105,
  2: 85,
  3: 110,
  4: 90,
};
const JOURNEY_PATH =
  "M0 105 C 250 105, 260 85, 450 85 S 620 110, 750 110 S 900 90, 1050 90 L 1200 90";

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
  // A stage's bubble and its label are one control: pointing at either one
  // lights up both.
  const [active, setActive] = useState<WorkflowStage | null>(null);

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
                active={active === summary.stage}
                onActiveChange={(on) => setActive(on ? summary.stage : null)}
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
              <StageLink
                summary={summary}
                active={active === summary.stage}
                onActiveChange={(on) => setActive(on ? summary.stage : null)}
              />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/**
 * One stage: a bubble with its icon, and a red ring and count if any wait is
 * long. It opens the same filtered queue as the label under it, so it is kept
 * out of the tab order and the accessibility tree: the label is the one link.
 */
function StageBubble({
  summary,
  cx,
  radius,
  active,
  onActiveChange,
}: {
  summary: StageSummary;
  cx: number;
  radius: number;
  active: boolean;
  onActiveChange: (active: boolean) => void;
}) {
  const tones = STAGE_TONES[summary.stage];
  const Icon = STAGE_ICONS[summary.stage];
  const cy = BUBBLE_CENTER_Y[summary.stage];
  const iconSize = Math.max(24, Math.round(radius * 0.86));
  // The badge sits on the bubble's upper right, wide enough for its digits.
  const badgeRadius = Math.max(16, 8 + 6 * String(summary.longWaits).length);
  const badgeOffset = radius * 0.72 + 4;

  return (
    <Link
      to="/requests"
      search={{ stage: summary.stage }}
      aria-hidden="true"
      tabIndex={-1}
      className="cursor-pointer outline-none"
      onMouseEnter={() => onActiveChange(true)}
      onMouseLeave={() => onActiveChange(false)}
    >
      <circle
        cx={cx}
        cy={cy}
        r={radius + 8}
        className={cn(
          tones.fill,
          "transition-opacity duration-200",
          active ? "opacity-40" : "opacity-20",
        )}
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
            r={radius + 13}
            className="fill-none stroke-destructive stroke-4 [stroke-dasharray:3_8] [stroke-linecap:round]"
          />
          <circle
            cx={cx + badgeOffset}
            cy={cy - badgeOffset}
            r={badgeRadius}
            className="fill-destructive"
          />
          <text
            x={cx + badgeOffset}
            y={cy - badgeOffset + 7}
            textAnchor="middle"
            className="fill-background text-[19px] font-bold"
          >
            {formatCount(summary.longWaits)}
          </text>
        </>
      ) : null}
    </Link>
  );
}

function StageLink({
  summary,
  active,
  onActiveChange,
}: {
  summary: StageSummary;
  active: boolean;
  onActiveChange: (active: boolean) => void;
}) {
  const tones = STAGE_TONES[summary.stage];
  return (
    <Link
      to="/requests"
      search={{ stage: summary.stage }}
      onMouseEnter={() => onActiveChange(true)}
      onMouseLeave={() => onActiveChange(false)}
      onFocus={() => onActiveChange(true)}
      onBlur={() => onActiveChange(false)}
      className={cn(
        "civic-interactive flex h-full flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-muted",
      )}
    >
      <span className="text-sm text-muted-foreground">
        Stage {summary.stage} of 4
      </span>
      <span className="text-lg font-bold text-balance">{summary.label}</span>
      <span
        className={cn(
          "text-3xl leading-tight font-extrabold tracking-tight tabular-nums",
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
