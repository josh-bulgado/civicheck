import { useId, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Copy, RefreshCw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { EditLimitsDialog } from "../components/EditLimitsDialog";
import { EmailAlertsCard } from "../components/EmailAlertsCard";
import { HealthComponentsCard } from "../components/HealthComponentsCard";
import { HealthDataPrivacyView } from "../components/HealthDataPrivacyView";
import { HealthIncidentsCard } from "../components/HealthIncidentsCard";
import { HealthVerdictCard } from "../components/HealthVerdictCard";
import { HealthRecentActivity } from "../components/HealthOverviewCards";
import { HealthResponseChart } from "../components/HealthResponseChart";
import { RecordMaintenanceDialog } from "../components/RecordMaintenanceDialog";
import { SecurityPostureCard } from "../components/SecurityPostureCard";
import { useHealthActions } from "../hooks/useHealthActions";
import { useHealthSampling } from "../hooks/useHealthSampling";
import { isOpenIncident, summaryText } from "../system-health.model";
import { formatHealthClock } from "../system-health.utils";
import type { SystemHealthDashboard } from "../system-admin.types";
import "../system-health.css";
import "../system-health-details.css";

export type HealthView = "overview" | "data";
type HealthDialog = "maintenance" | "limits" | "incidents" | "settings" | null;
type HealthPanel = "services" | "response" | "activity";

const AUDIT_SEARCH = {
  page: 1,
  actor: undefined,
  event: undefined,
  source: "system",
  from: undefined,
  to: undefined,
  account: undefined,
} as const;

// Checks, incidents, the monitor's own runs and the limits: any of them changing means the page is stale.
const WATCHED_TABLES = [
  "system_health_snapshots",
  "system_operational_events",
  "system_background_job_runs",
  "system_health_components",
];

export function SystemHealthPage({
  data: recordedData,
  view,
  onViewChange,
}: {
  data: SystemHealthDashboard;
  view: HealthView;
  onViewChange: (view: HealthView) => void;
}) {
  const navigate = useNavigate();
  const hotkeyLabel = useHotkeyLabel();
  const actions = useHealthActions();
  useRealtimeRefresh({ tables: WATCHED_TABLES });
  const sampling = useHealthSampling(recordedData, view === "overview");
  const data = sampling.data;
  const rowsRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<HealthDialog>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [panel, setPanel] = useState<HealthPanel>("services");
  const panelId = useId();

  const { canManage } = data;
  const checking = actions.pending === "check";
  const lastReading = sampling.sampledAt ?? data.checkedAt;
  // The dialog that opens on a service with an incident, so maintenance is one key away from the problem.
  const openIncident = data.events.find(
    (event) => isOpenIncident(event) && data.services.some((service) => service.key === event.componentKey),
  );

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText(data));
      toast.success("Summary copied.");
    } catch {
      toast.error("The summary could not be copied. Select the text and copy it by hand.");
    }
  }

  function moveRow(step: 1 | -1) {
    const rows = Array.from(rowsRef.current?.querySelectorAll<HTMLElement>("[data-health-row]") ?? []);
    if (rows.length === 0) return;
    const current = rows.indexOf(document.activeElement as HTMLElement);
    const next = current < 0 ? (step > 0 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, current + step));
    rows[next].focus();
  }

  // Plain keys are ignored while a field has focus, so typing in a dialog is unaffected.
  useHotkeys(
    [
      { hotkey: "R", callback: () => canManage && !checking && void actions.checkNow() },
      { hotkey: "C", callback: () => void copySummary() },
      { hotkey: "M", callback: () => canManage && setDialog("maintenance") },
      { hotkey: "E", callback: () => canManage && setDialog("limits") },
      { hotkey: "S", callback: () => void navigate({ to: "/system-admin/security" }) },
      { hotkey: "A", callback: () => void navigate({ to: "/system-admin/audit", search: AUDIT_SEARCH }) },
      { hotkey: "1", callback: () => onViewChange("overview") },
      { hotkey: "2", callback: () => onViewChange("data") },
      { hotkey: "J", callback: () => view === "overview" && moveRow(1) },
      { hotkey: "K", callback: () => view === "overview" && moveRow(-1) },
    ],
    { enabled: dialog === null && !detailsOpen },
  );

  return (
    <div className="dashboard-page system-health-page" data-health-view={view} data-health-panel={panel}>
      {view === "overview" ? <header className="health-page-header">
        <div className="health-page-heading">
          <h1>System Health</h1>
          <p>{lastReading ? `Last reading ${formatHealthClock(lastReading)}` : "Waiting for the first reading"}</p>
        </div>
        <div className="health-header-actions">
          <span className="health-live-status" data-paused={sampling.error || !sampling.sampledAt || undefined} role="status" title="Readings update every 5 seconds">
            <span aria-hidden="true" />{sampling.error ? "Reconnecting" : sampling.sampledAt ? "Live" : "Connecting"}
          </span>
          <Button type="button" variant="outline" shape="default" size="lg" aria-label="Copy summary" title={`Copy summary (${hotkeyLabel("C")})`} onClick={() => void copySummary()}>
            <Copy data-icon="inline-start" aria-hidden="true" />
            <span className="health-action-label">Copy summary</span>
          </Button>
          <Button type="button" variant="outline" shape="default" size="lg" aria-label="Monitoring settings" title="Monitoring settings" onClick={() => setDialog("settings")}>
            <Settings2 data-icon="inline-start" aria-hidden="true" />
            <span className="health-action-label">Monitoring settings</span>
          </Button>
          {canManage ? (
            <Button type="button" variant="raised" shape="default" size="lg" className="health-check-button" aria-label={checking ? "Checking" : "Check now"} title={`Run a health check (${hotkeyLabel("R")})`} disabled={checking} onClick={() => void actions.checkNow()}>
              {checking ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" aria-hidden="true" />}
              <span className="health-action-label">{checking ? "Checking" : "Check now"}</span>
            </Button>
          ) : null}
        </div>
      </header> : null}

      {view === "overview" ? (
        <>
          <HealthVerdictCard data={data} onShowIncidents={() => setDialog("incidents")} />
          <div className="health-panel-tabs" role="group" aria-label="Dashboard panels">
            {([['services', 'Services'], ['response', 'Response'], ['activity', 'Activity']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={panel === value} aria-controls={`${panelId}-${value}`} onClick={() => setPanel(value)}>{label}</button>)}
          </div>
          <div className="health-overview-grid">
            <div ref={rowsRef} id={`${panelId}-services`} className="health-services-panel min-w-0">
              <HealthComponentsCard
                data={data}
                onEditLimits={() => setDialog("limits")}
                onShowSources={() => onViewChange("data")}
                onDetailsOpenChange={setDetailsOpen}
              />
            </div>
            <aside className="health-overview-aside" aria-label="System health insights">
              <div id={`${panelId}-response`} className="health-chart-panel"><HealthResponseChart data={data} /></div>
              <div id={`${panelId}-activity`} className="health-activity-panel"><HealthRecentActivity data={data} onViewAll={() => void navigate({ to: "/system-admin/audit", search: AUDIT_SEARCH })} /></div>
            </aside>
          </div>
        </>
      ) : (
        <HealthDataPrivacyView data={recordedData} onBack={() => onViewChange("overview")} />
      )}

      <Dialog open={dialog === "incidents" || dialog === "settings"} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className={`health-dialog ${dialog === "incidents" ? "health-incidents-dialog" : "health-settings-dialog"}`} overlayClassName="health-dialog-backdrop">
          <DialogHeader>
            <DialogTitle>{dialog === "incidents" ? "System incidents" : "Monitoring settings"}</DialogTitle>
            <DialogDescription className="sr-only">{dialog === "incidents" ? "Review active incidents, history, and planned maintenance." : "Manage health alerts and review your security posture."}</DialogDescription>
          </DialogHeader>
          {dialog === "incidents" ? <HealthIncidentsCard data={data} pending={actions.pending} hotkeyLabel={hotkeyLabel} onAcknowledge={(eventId) => void actions.acknowledge(eventId)} onRecordMaintenance={() => setDialog("maintenance")} onCheckNow={() => void actions.checkNow()} /> : <>
            {data.security ? <SecurityPostureCard security={data.security} hotkeyLabel={hotkeyLabel} /> : null}
            <EmailAlertsCard settings={data.settings} canManage={canManage} pending={actions.pending === "alerts"} onChange={(enabled) => void actions.setAlerts(enabled)} />
            {canManage ? <div className="health-settings-actions"><Button variant="outline" onClick={() => setDialog("limits")}>Edit limits</Button><Button variant="outline" onClick={() => setDialog("maintenance")}>Record maintenance</Button></div> : null}
          </>}
        </DialogContent>
      </Dialog>

      <RecordMaintenanceDialog
        open={dialog === "maintenance"}
        services={data.services}
        defaultComponent={openIncident?.componentKey ?? "storage"}
        isPending={actions.pending === "maintenance"}
        onOpenChange={(open) => setDialog(open ? "maintenance" : null)}
        onConfirm={actions.record}
      />
      <EditLimitsDialog
        open={dialog === "limits"}
        data={data}
        isPending={actions.pending === "limits"}
        onOpenChange={(open) => setDialog(open ? "limits" : null)}
        onConfirm={actions.saveLimits}
      />
    </div>
  );
}
