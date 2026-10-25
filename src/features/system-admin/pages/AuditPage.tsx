import { AuditDataTable } from "../components/AuditDataTable";
import type { AuditFilters, NormalizedAuditEvent } from "../system-admin.types";
import "../audit-center.css";

export function AuditPage({
  events,
  total,
  filters,
  isLoading = false,
  error = null,
  onRetry,
}: {
  events: NormalizedAuditEvent[];
  total: number;
  filters: AuditFilters;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="dashboard-page audit-center-page">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
          Audit Center
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Metadata only. Citizen form data and documents are never included.
        </p>
      </header>
      <section aria-label="Audit events">
        <AuditDataTable
          data={events}
          total={total}
          filters={filters}
          isLoading={isLoading}
          error={error}
          onRetry={onRetry}
        />
      </section>
    </div>
  );
}
