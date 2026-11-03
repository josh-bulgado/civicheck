import { Badge } from "~/components/ui/badge";
import type { DeskWait } from "~/features/dashboard/staff-desk";
import type { WaitTone } from "~/features/requests/requests-table.utils";

/** The badge each wait tone wears. Only a wait on staff is coloured. */
export const WAIT_TONE_BADGE = {
  critical: "destructive",
  warning: "warning",
  normal: "neutral",
  quiet: "outline",
} as const satisfies Record<WaitTone, "destructive" | "warning" | "neutral" | "outline">;

/** How long a request has waited, as the queue's "In stage" figure. */
export function WaitPill({ wait, tone }: { wait: DeskWait; tone: WaitTone }) {
  return (
    <Badge
      variant={WAIT_TONE_BADGE[tone]}
      className="h-6 min-w-12 justify-center px-2.5 font-mono text-sm tabular-nums"
    >
      <span aria-hidden="true">{wait.short}</span>
      <span className="sr-only">Waiting {wait.spoken}</span>
    </Badge>
  );
}
