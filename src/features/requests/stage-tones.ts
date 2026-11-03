import type { WorkflowStage } from "./request-workflow";

/**
 * The colour each workflow stage wears wherever stages are shown: the queue's
 * stage chips and the overview's paper trays. Colour only repeats a label that
 * is always printed beside it, so nothing depends on seeing the hue.
 *
 * Whole class names, never built from parts, so Tailwind can find them.
 */
export const STAGE_TONES: Record<
  WorkflowStage,
  { dot: string; fill: string; stroke: string; text: string }
> = {
  1: {
    dot: "bg-health-warning-dot",
    fill: "fill-health-warning-dot",
    stroke: "stroke-health-warning-dot",
    text: "text-health-warning-fg",
  },
  2: {
    dot: "bg-health-info-dot",
    fill: "fill-health-info-dot",
    stroke: "stroke-health-info-dot",
    text: "text-health-info-fg",
  },
  3: {
    dot: "bg-tone-progress",
    fill: "fill-tone-progress",
    stroke: "stroke-tone-progress",
    text: "text-tone-progress",
  },
  4: {
    dot: "bg-health-success-dot",
    fill: "fill-health-success-dot",
    stroke: "stroke-health-success-dot",
    text: "text-health-success-fg",
  },
};
