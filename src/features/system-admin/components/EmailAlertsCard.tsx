import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import type { HealthSettings } from "../system-admin.types";

export function EmailAlertsCard({ settings, canManage, pending, onChange }: { settings: HealthSettings; canManage: boolean; pending: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <section className="health-setting-card health-email-setting">
      <div className="health-setting-heading"><h2 id="health-alerts-title">Email alerts</h2><div className="health-setting-switch">{pending ? <Spinner aria-hidden="true" /> : null}<Switch aria-labelledby="health-alerts-title" checked={settings.emailAlerts} disabled={!canManage || pending} onCheckedChange={onChange} /></div></div>
      <p>Email system administrators when an incident opens or closes. At most one email every {settings.cooldownMinutes} minutes.</p>
    </section>
  );
}
