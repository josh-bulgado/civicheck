import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Activity, ArrowLeft, Copy, RefreshCw, Settings2 } from "lucide-react";
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
import { HealthActiveIncidents, HealthRecentActivity } from "../components/HealthOverviewCards";
import { HealthResponseChart } from "../components/HealthResponseChart";
import { RecordMaintenanceDialog } from "../components/RecordMaintenanceDialog";
import { SecurityPostureCard } from "../components/SecurityPostureCard";
import { useHealthActions } from "../hooks/useHealthActions";
import { useHealthSampling } from "../hooks/useHealthSampling";
import { isOpenIncident, summaryText } from "../system-health.model";
import { formatHealthSampleClock } from "../system-health.utils";
import type { SystemHealthDashboard } from "../system-admin.types";
import "../system-health.css";

export type HealthView = "overview" | "data";
type HealthDialog = "maintenance" | "limits" | "incidents" | "settings" | null;

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

  const { canManage } = data;
  const checking = actions.pending === "check";
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
    <div className="dashboard-page system-health-page" data-health-view={view}>
      <header className="health-page-header">
        <div className="health-page-heading">
          <span className="health-title-icon"><Activity aria-hidden="true" /></span>
          <h1>System Health</h1>
        </div>
        <div className="health-header-actions">
          <Button type="button" variant="outline" shape="default" size="lg" title={`Copy summary (${hotkeyLabel("C")})`} onClick={() => void copySummary()}>
            <Copy data-icon="inline-start" aria-hidden="true" />
            Copy Summary
          </Button>
          {canManage ? (
            <Button type="button" variant="raised" shape="default" size="lg" className="health-check-button" title={`Run a health check (${hotkeyLabel("R")})`} disabled={checking} onClick={() => void actions.checkNow()}>
              {checking ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" aria-hidden="true" />}
              {checking ? "Checking" : "Check Now"}
            </Button>
          ) : null}
        </div>
      </header>

      {view === "overview" ? (
        <>
          <HealthVerdictCard data={data} onShowIncidents={() => setDialog("incidents")} />
          <div className="health-overview-grid">
            <div ref={rowsRef} className="min-w-0">
              <HealthComponentsCard
                data={data}
                onEditLimits={() => setDialog("limits")}
                onShowSources={() => onViewChange("data")}
                onDetailsOpenChange={setDetailsOpen}
              />
            </div>
            <aside className="health-overview-aside" aria-label="System health insights">
              <HealthActiveIncidents data={data} onViewAll={() => setDialog("incidents")} />
              <HealthResponseChart data={data} />
              <HealthRecentActivity data={data} onViewAll={() => void navigate({ to: "/system-admin/audit", search: AUDIT_SEARCH })} />
            </aside>
          </div>
          <footer className="health-page-footer">
            <p role="status">{sampling.error ? "Updates paused · retrying connection" : `Updates every 5 seconds${sampling.sampledAt ? ` · Last reading ${formatHealthSampleClock(sampling.sampledAt)}` : " · Connecting…"}`}</p>
            <div className="health-footer-actions">
              <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" title="TradingView Lightweight Charts™. Copyright (с) 2025 TradingView, Inc.">Charts by TradingView</a>
              <button type="button" onClick={() => setDialog("settings")}><Settings2 className="size-3.5" aria-hidden="true" />Monitoring settings</button>
            </div>
          </footer>
        </>
      ) : (
        <div className="space-y-5">
          <Button variant="ghost" onClick={() => onViewChange("overview")}><ArrowLeft className="size-4" aria-hidden="true" />Back to overview</Button>
          <HealthDataPrivacyView data={recordedData} hotkeyLabel={hotkeyLabel} onEditLimits={() => setDialog("limits")} />
        </div>
      )}

      <Dialog open={dialog === "incidents" || dialog === "settings"} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog === "incidents" ? "System Incidents" : "Monitoring Settings"}</DialogTitle>
            <DialogDescription>{dialog === "incidents" ? "Review active incidents, history, and planned maintenance." : "Manage health alerts and review your security posture."}</DialogDescription>
          </DialogHeader>
          {dialog === "incidents" ? <HealthIncidentsCard data={data} pending={actions.pending} hotkeyLabel={hotkeyLabel} onAcknowledge={(eventId) => void actions.acknowledge(eventId)} onRecordMaintenance={() => setDialog("maintenance")} onCheckNow={() => void actions.checkNow()} /> : <>
            {data.security ? <SecurityPostureCard security={data.security} hotkeyLabel={hotkeyLabel} /> : null}
            <EmailAlertsCard settings={data.settings} canManage={canManage} pending={actions.pending === "alerts"} onChange={(enabled) => void actions.setAlerts(enabled)} />
            {canManage ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDialog("limits")}>Edit Limits</Button><Button variant="outline" onClick={() => setDialog("maintenance")}>Record Maintenance</Button></div> : null}
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
