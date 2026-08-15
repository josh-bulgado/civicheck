import { ScrollText } from "lucide-react";
import { AuditDataTable } from "./components/AuditDataTable";
import { SystemAdminPageHeader } from "./components/SystemAdminPageHeader";
import type { AuditFilters, NormalizedAuditEvent } from "./system-admin.types";

export function AuditPage({
  events,
  total,
  filters,
}: {
  events: NormalizedAuditEvent[];
  total: number;
  filters: AuditFilters;
}) {
  return (
    <div className="dashboard-page">
      <SystemAdminPageHeader
        icon={ScrollText}
        title="Audit center"
        description="Review metadata-only account and request activity. Citizen form data and documents are never included."
      />
      <section className="dashboard-panel overflow-hidden">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Activity history
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            System and request audit events
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter activity by actor, event, source, or date range.
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <AuditDataTable data={events} total={total} filters={filters} />
        </div>
      </section>
    </div>
  );
}
