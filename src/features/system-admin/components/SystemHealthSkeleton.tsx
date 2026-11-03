import { Skeleton } from "~/components/ui/skeleton";
import "../system-health.css";

/** Keep the overview's actual tiles and responsive layout while readings load. */
export function SystemHealthSkeleton() {
  return (
    <div
      className="dashboard-page system-health-page"
      data-page-skeleton
      data-health-view="overview"
      data-health-panel="services"
      role="status"
      aria-busy="true"
      aria-label="Loading system health"
    >
      <div className="health-page-header" aria-hidden="true">
        <div className="health-page-heading space-y-2">
          <Skeleton className="h-8 w-44 max-w-full" />
          <Skeleton className="h-4 w-36 max-w-full" />
        </div>
        <div className="health-header-actions">
          <Skeleton className="health-live-status h-7 w-16 rounded-full" />
          {[0, 1, 2].map((action) => (
            <div key={action} className="health-skeleton-action">
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="health-action-label h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="health-panel health-summary" aria-hidden="true">
        <div className="health-summary-status">
          <Skeleton className="health-metric-icon" />
          <div className="health-metric-copy flex-1">
            <Skeleton className="health-verdict-badge w-20">&nbsp;</Skeleton>
            <Skeleton className="health-verdict-title w-40 max-w-full">&nbsp;</Skeleton>
            <Skeleton className="health-verdict-description w-48 max-w-full">&nbsp;</Skeleton>
          </div>
        </div>
        {[0, 1, 2].map((metric) => (
          <div key={metric} className="health-summary-metric">
            <Skeleton className="health-metric-label w-20 max-w-full">&nbsp;</Skeleton>
            <Skeleton className="health-metric-value w-24 max-w-full">&nbsp;</Skeleton>
            <Skeleton className="health-summary-visual flex-1 min-h-6" />
            <Skeleton className="health-metric-note health-summary-fallback w-24 max-w-full">&nbsp;</Skeleton>
          </div>
        ))}
        <div className="health-status-history">
          <div className="health-history-heading"><Skeleton className="h-3 w-32" /></div>
          <Skeleton className="health-history-track" />
          <div className="health-history-axis"><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-12" /></div>
        </div>
      </div>

      <div className="health-panel-tabs" aria-hidden="true"><Skeleton className="h-full w-full rounded-full" /></div>
      <div className="health-overview-grid" aria-hidden="true">
        <div className="health-services-panel">
          <div className="health-panel health-services">
            <div className="health-services-toolbar">
              <h2><Skeleton className="h-5 w-16" /></h2>
              <Skeleton className="health-service-tabs h-8 w-44 max-w-full" />
              <Skeleton className="health-search" />
            </div>
            <div className="health-table-scroll">
              <table className="health-table">
                <thead><tr>{[0, 1, 2, 3, 4, 5, 6].map((column) => <th key={column}><Skeleton className="h-3 w-full" /></th>)}</tr></thead>
                <tbody>{[0, 1, 2, 3, 4].map((row) => (
                  <tr key={row}>
                    <td><div className="health-component-name"><Skeleton className="health-component-icon" /><Skeleton className="h-4 w-20 max-w-full" /></div></td>
                    {[0, 1, 2, 3, 4, 5].map((column) => <td key={column}><Skeleton className="h-4 w-full max-w-16" /></td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="health-service-footer"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-28 rounded-full" /></div>
          </div>
        </div>
        <aside className="health-overview-aside">
          <div className="health-chart-panel">
            <section className="health-panel health-trading-chart">
              <div className="health-card-heading"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-24 rounded-full" /></div>
              <div className="health-chart-quote"><Skeleton className="h-8 w-24" /></div>
              <Skeleton className="health-chart-plot min-h-8" />
              <div className="health-chart-controls"><Skeleton className="h-7 w-40 rounded-full" /><Skeleton className="h-3 w-16" /></div>
            </section>
          </div>
          <div className="health-activity-panel">
            <section className="health-panel health-activity">
              <div className="health-card-heading"><Skeleton className="h-5 w-28" /><Skeleton className="h-7 w-20 rounded-full" /></div>
              <div className="health-activity-list">{[0, 1, 2].map((entry) => <div key={entry} className="flex items-center gap-2 py-2"><Skeleton className="size-2 rounded-full" /><Skeleton className="h-3 w-full" /></div>)}</div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
