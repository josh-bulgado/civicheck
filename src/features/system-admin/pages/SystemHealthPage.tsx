import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { EditLimitsDialog } from "../components/EditLimitsDialog";
import { EmailAlertsCard } from "../components/EmailAlertsCard";
import { HealthComponentsCard } from "../components/HealthComponentsCard";
import { HealthDataPrivacyView } from "../components/HealthDataPrivacyView";
import { HealthIncidentsCard } from "../components/HealthIncidentsCard";
import { HealthVerdictCard } from "../components/HealthVerdictCard";
import { RealtimeStatusBadge } from "../components/RealtimeStatusBadge";
import { RecordMaintenanceDialog } from "../components/RecordMaintenanceDialog";
import { SecurityPostureCard } from "../components/SecurityPostureCard";
import { useHealthActions } from "../hooks/useHealthActions";
import { headerLine, isOpenIncident, summaryText } from "../system-health.model";
import type { SystemHealthDashboard } from "../system-admin.types";

export type HealthView = "overview" | "data";
type Dialog = "maintenance" | "limits" | null;

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
  data,
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
  const realtimeStatus = useRealtimeRefresh({ tables: WATCHED_TABLES });
  const rowsRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

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
    { enabled: dialog === null },
  );

  return (
    <div className="dashboard-page">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">System Health</h1>
          <p className="text-pretty text-base text-muted-foreground">{headerLine(data)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RealtimeStatusBadge status={realtimeStatus} subject="checks" />
          <Button type="button" variant="outline" size="lg" onClick={() => void copySummary()}>
            <Copy data-icon="inline-start" aria-hidden="true" />
            Copy Summary
            <Kbd aria-hidden="true">{hotkeyLabel("C")}</Kbd>
          </Button>
          {canManage ? (
            <Button type="button" variant="raised" size="lg" disabled={checking} onClick={() => void actions.checkNow()}>
              {checking ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" aria-hidden="true" />}
              {checking ? "Checking" : "Check Now"}
              {!checking ? <Kbd aria-hidden="true">{hotkeyLabel("R")}</Kbd> : null}
            </Button>
          ) : null}
        </div>
      </header>

      <Tabs value={view} onValueChange={(next) => onViewChange(next as HealthView)} className="gap-6">
        <div className="flex items-end gap-4 border-b border-border-light">
          <TabsList variant="counted" aria-label="System Health views" className="flex-1 border-b-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data &amp; Privacy</TabsTrigger>
          </TabsList>
          <p className="hidden items-center gap-1.5 pb-2 text-sm text-muted-foreground sm:flex">
            <Kbd aria-hidden="true">{hotkeyLabel("1")}</Kbd>
            <Kbd aria-hidden="true">{hotkeyLabel("2")}</Kbd>
            to switch view
          </p>
        </div>

        <TabsContent value="overview" className="flex flex-col gap-6">
          <HealthVerdictCard data={data} />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
            <div ref={rowsRef}>
              <HealthComponentsCard
                data={data}
                hotkeyLabel={hotkeyLabel}
                onEditLimits={() => setDialog("limits")}
                onShowSources={() => onViewChange("data")}
              />
            </div>
            <div className="flex flex-col gap-6">
              <HealthIncidentsCard
                data={data}
                pending={actions.pending}
                hotkeyLabel={hotkeyLabel}
                onAcknowledge={(eventId) => void actions.acknowledge(eventId)}
                onRecordMaintenance={() => setDialog("maintenance")}
                onCheckNow={() => void actions.checkNow()}
              />
              {data.security ? <SecurityPostureCard security={data.security} hotkeyLabel={hotkeyLabel} /> : null}
              <EmailAlertsCard
                settings={data.settings}
                canManage={canManage}
                pending={actions.pending === "alerts"}
                onChange={(enabled) => void actions.setAlerts(enabled)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <HealthDataPrivacyView data={data} hotkeyLabel={hotkeyLabel} onEditLimits={() => setDialog("limits")} />
        </TabsContent>
      </Tabs>

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
