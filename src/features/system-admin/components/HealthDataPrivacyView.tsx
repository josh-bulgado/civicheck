import { useState } from "react";
import { ArrowLeft, CircleCheck, CircleX, LockKeyhole, type LucideIcon } from "lucide-react";
import { privacyBoundary } from "../system-health.constants";
import { formatHealthClock, formatHealthTimestamp } from "../system-health.utils";
import type { HealthSource, SystemHealthDashboard } from "../system-admin.types";

type PrivacyPanel = "recorded" | "never" | "access" | "sources";
type SourceRow = { key: string; name: string; source: HealthSource; lastWrite: string | null };

function BoundaryCard({ title, items, icon: Icon, tone, panel }: { title: string; items: readonly string[]; icon: LucideIcon; tone: string; panel: PrivacyPanel }) {
  return (
    <section className="health-panel health-boundary-card" data-privacy-section={panel}>
      <h2><span className="health-boundary-icon" data-tone={tone}><Icon aria-hidden="true" /></span>{title}</h2>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

function sourceRows(data: SystemHealthDashboard): SourceRow[] {
  return [
    ...data.services.map((service) => ({ key: service.key, name: service.name, source: service.source, lastWrite: service.lastCheckedAt })),
    { key: "capacity", name: data.capacity.name, source: data.capacity.source, lastWrite: data.capacity.lastCheckedAt },
    { key: "monitor", name: data.monitor.name, source: data.monitor.source, lastWrite: data.monitor.lastRunAt },
  ];
}

export function HealthDataPrivacyView({ data, onBack }: { data: SystemHealthDashboard; onBack: () => void }) {
  const [panel, setPanel] = useState<PrivacyPanel>("recorded");
  const [sourceKey, setSourceKey] = useState<string>(data.services[0]?.key ?? "database");
  const rows = sourceRows(data);
  const selected = rows.find((row) => row.key === sourceKey) ?? rows[0];
  return (
    <div className="health-privacy-view" data-privacy-panel={panel}>
      <header className="health-privacy-header">
        <button type="button" className="health-back-button" onClick={onBack}><ArrowLeft aria-hidden="true" />Back to System Health</button>
        <h1>Data &amp; privacy</h1>
        <p>Charts include five-second session readings while the dashboard is open. Session readings are not retained; historical uptime and incidents come from the background monitor.</p>
      </header>
      <div className="health-privacy-tabs" role="group" aria-label="Data and privacy sections">
        {([["recorded", "Recorded"], ["never", "Never recorded"], ["access", "Access"], ["sources", "Data sources"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={panel === value} onClick={() => setPanel(value)}>{label}</button>)}
      </div>
      <div className="health-boundary-grid">
        <BoundaryCard title="Recorded" items={privacyBoundary.recorded} icon={CircleCheck} tone="success" panel="recorded" />
        <BoundaryCard title="Never recorded" items={privacyBoundary.never} icon={CircleX} tone="error" panel="never" />
        <BoundaryCard title="Who sees it, and for how long" items={privacyBoundary.access} icon={LockKeyhole} tone="info" panel="access" />
      </div>
      <section className="health-panel health-sources-card" data-privacy-section="sources" aria-labelledby="health-sources-title">
        <div className="health-sources-heading"><h2 id="health-sources-title">Where each number comes from</h2><p>One row per component. A new component appears here without a code change.</p></div>
        <div className="health-sources-table-wrap">
          <table className="health-sources-table">
            <thead><tr><th scope="col">Component</th><th scope="col">Measured by</th><th scope="col">Updates</th><th scope="col">Exposure</th><th scope="col">Last write</th></tr></thead>
            <tbody>{rows.map(({ key, name, source, lastWrite }) => <tr key={key}>
              <th scope="row">{name}</th><td>{source.measuredBy}</td><td>{source.updates}</td><td>{source.exposure}</td>
              <td>{lastWrite ? <time dateTime={lastWrite} title={formatHealthTimestamp(lastWrite)}>{formatHealthClock(lastWrite)}</time> : "Never"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="health-source-inspector">
          <label htmlFor="health-source-component">Component</label>
          <select id="health-source-component" value={selected?.key ?? ""} onChange={(event) => setSourceKey(event.target.value)}>{rows.map((row) => <option key={row.key} value={row.key}>{row.name}</option>)}</select>
          {selected ? <dl>
            <div><dt>Measured by</dt><dd>{selected.source.measuredBy}</dd></div>
            <div><dt>Updates</dt><dd>{selected.source.updates}</dd></div>
            <div><dt>Exposure</dt><dd>{selected.source.exposure}</dd></div>
            <div><dt>Last write</dt><dd>{selected.lastWrite ? formatHealthTimestamp(selected.lastWrite) : "Never"}</dd></div>
          </dl> : null}
        </div>
      </section>
    </div>
  );
}
