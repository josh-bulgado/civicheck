import { useState } from "react";
import { Activity, Archive, ChevronRight, Database, Ellipsis, HardDrive, LockKeyhole, Search, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { formatBytes, formatHealthPercent, formatHealthTimestamp, formatResponseTime, healthTimeAgo } from "../system-health.utils";
import type { HealthCheck, HealthSource, HealthStatus, ServiceKey, SystemHealthDashboard } from "../system-admin.types";
import { HealthMetrics, HealthSourceBlock } from "./HealthFacts";
import { HealthStatusBadge } from "./HealthStatusBadge";
import { HealthSparkline } from "./HealthCharts";

const icons: Record<ServiceKey, LucideIcon> = { database: Database, authentication: LockKeyhole, storage: HardDrive };

type ComponentRow = {
  key: string;
  name: string;
  description: string;
  group: "core" | "platform";
  status: HealthStatus;
  statusLabel?: string;
  failed?: boolean;
  icon: LucideIcon;
  responseMs: number | null;
  uptime: number | null;
  checkedAt: string | null;
  checks: HealthCheck[];
  source: HealthSource;
  metrics: { label: string; value: string | number }[];
};

export function HealthComponentsCard({
  data, onEditLimits, onShowSources, onDetailsOpenChange,
}: {
  data: SystemHealthDashboard;
  onEditLimits: () => void;
  onShowSources: () => void;
  onDetailsOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const rows: ComponentRow[] = [
    ...data.services.map((service): ComponentRow => ({
      ...service, group: "core", icon: icons[service.key], failed: service.outcome === "failed",
      uptime: service.availabilityPercent, checkedAt: service.lastCheckedAt,
      metrics: [
        { label: "Response time", value: service.outcome === "failed" ? "Timed out" : formatResponseTime(service.responseMs) },
        { label: "24h uptime", value: service.availabilityPercent === null ? "No checks" : formatHealthPercent(service.availabilityPercent) },
        { label: "Slow after", value: formatResponseTime(service.slowAfterMs) },
        { label: "Checks (OK / slow / failed)", value: `${service.okCount} / ${service.slowCount} / ${service.failedCount}` },
      ],
    })),
    {
      key: "capacity", name: data.capacity.name, description: data.capacity.description,
      group: "platform", icon: Archive, status: data.capacity.configured ? data.capacity.status : "unknown",
      statusLabel: data.capacity.configured ? undefined : "Not configured",
      responseMs: null, uptime: null, checkedAt: data.capacity.lastCheckedAt, checks: [], source: data.capacity.source,
      metrics: [
        { label: "Storage used", value: data.capacity.totalBytes === null ? "No reading" : formatBytes(data.capacity.totalBytes) },
        { label: "Objects", value: data.capacity.objectCount ?? "No reading" },
        { label: "Capacity", value: data.capacity.capacityBytes === null ? "Not configured" : formatBytes(data.capacity.capacityBytes) },
        { label: "Used capacity", value: data.capacity.percentUsed === null ? "Not configured" : formatHealthPercent(data.capacity.percentUsed) },
      ],
    },
    {
      key: "monitor", name: data.monitor.name, description: data.monitor.description,
      group: "platform", icon: Activity, status: data.monitor.status,
      statusLabel: data.monitor.status === "unknown" ? "Not scheduled" : undefined,
      responseMs: null, uptime: data.monitor.runs24h ? data.monitor.succeeded24h / data.monitor.runs24h * 100 : null,
      checkedAt: data.monitor.lastRunAt, checks: [], source: data.monitor.source,
      metrics: [
        { label: "Runs in 24h", value: data.monitor.runs24h },
        { label: "Successful runs", value: data.monitor.succeeded24h },
        { label: "Last run", value: data.monitor.lastRunAt ? formatHealthTimestamp(data.monitor.lastRunAt) : "Never" },
        { label: "Last result", value: data.monitor.lastRunSucceeded === null ? "No runs" : data.monitor.lastRunSucceeded ? "Succeeded" : "Failed" },
      ],
    },
  ];
  const visible = rows.filter((row) =>
    (group === "all" || row.group === group) &&
    row.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const selected = rows.find((row) => row.key === selectedKey);

  function showDetails(key: string | null) {
    setSelectedKey(key);
    onDetailsOpenChange(key !== null);
  }

  return (
    <section className="health-panel health-services" aria-labelledby="service-health-title">
      <div className="health-services-toolbar">
        <h2 id="service-health-title">Services</h2>
        <div className="health-service-tabs" role="group" aria-label="Component category">
          {[["all", "All"], ["core", "Core services"], ["platform", "Platform services"]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={group === value} onClick={() => setGroup(value)}>{label}</button>
          ))}
        </div>
        <label className="health-search" data-active={query.length > 0 || undefined}>
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <input aria-label="Search components" placeholder="Search components" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <div className="health-table-scroll" role="region" aria-label="Service health components">
        <table className="health-table">
          <thead><tr>
            <th scope="col">Component</th><th scope="col">Status</th><th scope="col">Response</th>
            <th scope="col" title="Availability over the last 24 hours">Uptime</th><th scope="col">Trend</th><th scope="col">Last checked</th><th scope="col"><span className="sr-only">Actions</span></th>
          </tr></thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.key}>
                <th scope="row">
                  <button type="button" data-health-row className="health-component-name" onClick={() => showDetails(row.key)}>
                    <span className="health-component-icon" data-status={row.failed ? "outage" : row.status}><row.icon aria-hidden="true" /></span>
                    <span>{row.name}</span>
                  </button>
                </th>
                <td>{row.failed ? <HealthStatusBadge status="outage" label="Failed" /> : row.statusLabel ? <span className="health-neutral-badge">{row.statusLabel}</span> : <HealthStatusBadge status={row.status} />}</td>
                <td className="health-response-cell">{row.failed ? <span className="health-response-failed">Timed out</span> : row.responseMs === null ? <span className="health-no-reading" title="Response time is not measured for this component">—</span> : formatResponseTime(row.responseMs)}</td>
                <td className="font-semibold tabular-nums">{row.uptime === null ? <span className="health-no-reading">—</span> : <span title={row.key === "monitor" ? "Successful scheduled runs in the last 24 hours" : undefined}>{formatHealthPercent(row.uptime)}</span>}</td>
                <td><HealthSparkline checks={row.checks} status={row.status} /></td>
                <td className="health-checked">{row.checkedAt ? <time dateTime={row.checkedAt} title={formatHealthTimestamp(row.checkedAt)}>{healthTimeAgo(row.checkedAt, data.now).replace(/\bminutes?\b/, "min")}</time> : "—"}</td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger nativeButton render={<Button variant="ghost" size="icon" aria-label={`Actions for ${row.name}`} />}><Ellipsis aria-hidden="true" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      <DropdownMenuItem onClick={() => showDetails(row.key)}>View details</DropdownMenuItem>
                      {data.canManage && row.key !== "monitor" ? <DropdownMenuItem onClick={onEditLimits}>Edit limits</DropdownMenuItem> : null}
                      <DropdownMenuItem onClick={onShowSources}>View data source</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {!visible.length ? <tr><td colSpan={7} className="health-table-empty">No components match your filters. <button type="button" onClick={() => { setQuery(""); setGroup("all"); }}>Clear filters</button></td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="health-service-footer">
        <span className="health-component-count" role="status">{visible.length === rows.length ? `${rows.length} components` : `${visible.length} of ${rows.length} components`}</span>
        <button type="button" onClick={onShowSources}><ChevronRight aria-hidden="true" />Data &amp; privacy</button>
      </div>
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) showDetails(null); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>{selected?.description}</DialogDescription></DialogHeader>
          {selected ? <>
            {selected.failed ? <HealthStatusBadge status="outage" label="Failed" /> : selected.statusLabel ? <span className="text-sm text-muted-foreground">{selected.statusLabel}</span> : <HealthStatusBadge status={selected.status} />}
            <HealthMetrics items={selected.metrics} />
            <HealthSourceBlock source={selected.source}>
              <div className="flex flex-wrap gap-2">
                {data.canManage && selected.key !== "monitor" ? <Button variant="outline" onClick={() => { showDetails(null); onEditLimits(); }}><SlidersHorizontal className="size-4" />Edit Limits</Button> : null}
                <Button variant="ghost" onClick={() => { showDetails(null); onShowSources(); }}>All Sources</Button>
              </div>
            </HealthSourceBlock>
          </> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
