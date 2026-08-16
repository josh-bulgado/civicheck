import { ScrollText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { AuditDataTable } from "../components/AuditDataTable";
import { SystemAdminPageHeader } from "../components/SystemAdminPageHeader";
import type { AuditFilters, NormalizedAuditEvent } from "../system-admin.types";

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
        title="Audit Center"
        description="Review metadata-only account and request activity. Citizen form data and documents are never included."
      />
      <section aria-labelledby="audit-events-title">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>
              <h2 id="audit-events-title" className="text-pretty">
                System &amp; Request Audit Events
              </h2>
            </CardTitle>
            <CardDescription>
              Filter activity by actor, event, source, or date range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditDataTable data={events} total={total} filters={filters} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
