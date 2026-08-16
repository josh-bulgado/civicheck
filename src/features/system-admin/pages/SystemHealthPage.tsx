import { Activity } from "lucide-react";
import { ActiveIncidentsSection } from "../components/ActiveIncidentsSection";
import { HealthHeaderStatus } from "../components/HealthHeaderStatus";
import { HealthSummary } from "../components/HealthSummary";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { OperationalSignalsTable } from "../components/OperationalSignalsTable";
import { ServiceHealthSection } from "../components/ServiceHealthSection";
import { SystemAdminPageHeader } from "../components/SystemAdminPageHeader";
import { TelemetrySourcesDisclosure } from "../components/TelemetrySourcesDisclosure";
import type { SystemHealthDashboard } from "../system-admin.types";

export function SystemHealthPage({ data }: { data: SystemHealthDashboard }) {
  return (
    <div className="dashboard-page system-health-page">
      <a
        href="#system-health-content"
        className="sr-only rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-md focus:fixed focus:top-4 focus:left-4 focus:not-sr-only focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to Health Dashboard
      </a>
      <SystemAdminPageHeader
        icon={Activity}
        title="System Health"
        description="Monitor platform reliability using aggregate, redacted telemetry that never exposes citizen submissions or documents."
        actions={
          <HealthHeaderStatus
            status={data.overallStatus}
            checkedAt={data.checkedAt}
            services={data.services}
          />
        }
      />

      <HealthSummary data={data} />
      <ServiceHealthSection services={data.services} />
      <OperationalSignalsTable signals={data.signals} />
      <ActiveIncidentsSection
        events={data.events}
        signals={data.signals}
        checkedAt={data.checkedAt}
      />
      <IncidentTimeline events={data.events} />
      <TelemetrySourcesDisclosure />
    </div>
  );
}
