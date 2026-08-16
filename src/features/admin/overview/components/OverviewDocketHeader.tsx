import { Landmark } from "lucide-react";
import {
  formatCount,
  formatOfficeDate,
} from "~/features/admin/overview/overview-formatters";

interface OverviewDocketHeaderProps {
  queueDate: string;
  openRequests: number;
  citizensInQueue: number;
}

export function OverviewDocketHeader({
  queueDate,
  openRequests,
  citizensInQueue,
}: OverviewDocketHeaderProps) {
  return (
    <header className="dashboard-hero">
      <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            <Landmark className="size-4" aria-hidden="true" />
            City Civil Registry Office · Daily Operations
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="text-balance text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              Today&apos;s Operations Docket
            </h1>
            <p className="max-w-2xl text-pretty text-sm leading-6 text-white/80">
              Prioritize citizen follow-up, monitor the five-stage request
              workflow, and keep the counter queue moving.
            </p>
          </div>
          <p className="text-xs font-medium text-white/80">
            Office Day · {formatOfficeDate(queueDate)}
          </p>
        </div>

        <dl className="grid min-w-64 grid-cols-2 gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-sm">
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs text-white/80">Open Requests</dt>
            <dd className="text-2xl font-extrabold tabular-nums">
              {formatCount(openRequests)}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1 border-l border-white/15 pl-4">
            <dt className="text-xs text-white/80">Citizens in Queue</dt>
            <dd className="text-2xl font-extrabold tabular-nums">
              {formatCount(citizensInQueue)}
            </dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
