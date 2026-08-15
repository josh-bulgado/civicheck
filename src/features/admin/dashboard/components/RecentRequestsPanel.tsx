import { FileClock } from "lucide-react";
import type { AdminDashboardData } from "../dashboard.types";
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusTone,
} from "../dashboard.utils";
import { EmptyState, PanelHeader, StatusPill } from "./DashboardPanelPrimitives";

export function RecentRequestsPanel({
  recentRequests,
}: Pick<AdminDashboardData, "recentRequests">) {
  return (
    <section className="dashboard-panel overflow-hidden" aria-labelledby="recent-heading">
      <PanelHeader
        eyebrow="Latest activity"
        title="Recent requests"
        description="The eight most recently submitted requests."
        actionHref="/requests"
        headingId="recent-heading"
      />
      {recentRequests.length === 0 ? (
        <EmptyState
          icon={FileClock}
          title="No requests yet"
          description="New submissions will appear here automatically."
        />
      ) : (
        <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
          {recentRequests.map((item) => (
            <article
              key={item.id}
              className="flex min-w-0 items-start gap-3 border-b border-border p-5 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <FileClock className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate font-mono text-xs font-bold">{item.trackingNumber}</p>
                  <span className="text-xs text-muted-foreground">{formatDate(item.submittedAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5">{item.serviceName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusPill className={getStatusTone(item.status)}>{getStatusLabel(item.status)}</StatusPill>
                  <span className="text-xs font-medium text-muted-foreground">{formatCurrency(item.feeDue)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
