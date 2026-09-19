import type { LucideIcon } from "lucide-react";
import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
  index: number;
}

export function StatTile({ icon: Icon, label, value, accent, index }: StatTileProps) {
  return (
    <article
      className="dashboard-stat civic-interactive civic-lift"
      style={staggerStyle(index)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span className={`size-1.5 shrink-0 rounded-full ${accent}`} aria-hidden="true" />
            {label}
          </p>
          <CountUp
            value={value}
            className="mt-3 block text-4xl font-semibold tracking-tight text-foreground tabular-nums"
          />
        </div>
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground/40" aria-hidden="true" />
      </div>
    </article>
  );
}
