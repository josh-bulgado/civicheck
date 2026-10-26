import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, RotateCcw } from "lucide-react";
import type { IChartApi, ISeriesApi, Time, UTCTimestamp } from "lightweight-charts";
import type { SystemHealthDashboard } from "../system-admin.types";
import { formatResponseTime } from "../system-health.utils";
import { healthChartPoints, healthChartStats, planHealthChartUpdate, type HealthChartPoint } from "../system-health-chart.model";

const RANGES = [[900, "15m"], [3600, "1h"], [21600, "6h"], [86400, "24h"]] as const;
const clock = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function chartColors(container: HTMLElement) {
  const styles = getComputedStyle(container);
  return {
    ink: styles.getPropertyValue("--muted-foreground").trim(),
    grid: styles.getPropertyValue("--health-edge").trim(),
    line: styles.getPropertyValue("--primary").trim(),
    background: styles.getPropertyValue("--card").trim(),
    warning: styles.getPropertyValue("--health-warning-dot").trim(),
  };
}

export const HealthResponseChart = memo(function HealthResponseChart({ data }: { data: SystemHealthDashboard }) {
  const [serviceKey, setServiceKey] = useState(data.services[0]?.key);
  const [range, setRange] = useState<number>(3600);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const selectedRange = useRef(range);
  const container = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Area"> | null>(null);
  const previous = useRef<{ key: string | undefined; points: HealthChartPoint[] }>({ key: undefined, points: [] });
  const service = data.services.find((item) => item.key === serviceKey) ?? data.services[0];
  const points = useMemo(() => healthChartPoints(service?.checks ?? []), [service?.checks]);
  const stats = useMemo(() => healthChartStats(points, range), [points, range]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let disposed = false;
    let observer: MutationObserver | undefined;
    let api: IChartApi | undefined;
    void import("lightweight-charts").then(({ AreaSeries, ColorType, CrosshairMode, LineStyle, TickMarkType, createChart }) => {
      if (disposed) return;
      const colors = chartColors(element);
      api = createChart(element, {
        autoSize: true,
        // The page footer provides the visible TradingView attribution link.
        layout: { background: { type: ColorType.Solid, color: colors.background }, textColor: colors.ink, fontFamily: "Geist Variable, sans-serif", fontSize: 10, attributionLogo: false },
        grid: { vertLines: { color: colors.grid, style: LineStyle.Dotted }, horzLines: { color: colors.grid, style: LineStyle.Dotted } },
        crosshair: { mode: CrosshairMode.Normal, vertLine: { color: colors.ink, width: 1, style: LineStyle.Dashed }, horzLine: { color: colors.ink, width: 1, style: LineStyle.Dashed } },
        rightPriceScale: { borderVisible: false, minimumWidth: 61, scaleMargins: { top: .18, bottom: .12 } },
        timeScale: { timeVisible: true, secondsVisible: true, borderVisible: false, rightOffset: 3, minBarSpacing: .1, tickMarkFormatter: (time: Time, type: number) => typeof time === "number" ? clock.format(new Date(time * 1000)).slice(0, type === TickMarkType.TimeWithSeconds ? 8 : 5) : "" },
        localization: { locale: "en-PH", timeFormatter: (time: Time) => typeof time === "number" ? clock.format(new Date(time * 1000)) : "", priceFormatter: (value: number) => `${Math.round(value)} ms` },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      });
      const area = api.addSeries(AreaSeries, {
        lineColor: colors.line, topColor: `${colors.line}30`, bottomColor: `${colors.line}00`, lineWidth: 2,
        priceFormat: { type: "custom", minMove: 1, formatter: (value: number) => `${Math.round(value)} ms` },
        crosshairMarkerVisible: true, crosshairMarkerRadius: 4, lastValueVisible: true, priceLineVisible: true,
      });
      chart.current = api;
      series.current = area;
      api.subscribeCrosshairMove((event) => {
        const tip = tooltip.current;
        const point = event.seriesData.get(area);
        if (!tip || !event.point || typeof event.time !== "number" || !point || !("value" in point)) { if (tip) tip.hidden = true; return; }
        tip.hidden = false;
        tip.textContent = `${clock.format(new Date(event.time * 1000))} · ${formatResponseTime(point.value)}`;
        tip.style.left = `${Math.max(8, Math.min(event.point.x + 12, element.clientWidth - 180))}px`;
        tip.style.top = `${Math.max(8, event.point.y - 36)}px`;
      });
      observer = new MutationObserver(() => {
        const next = chartColors(element);
        api?.applyOptions({ layout: { background: { type: ColorType.Solid, color: next.background }, textColor: next.ink }, grid: { vertLines: { color: next.grid }, horzLines: { color: next.grid } } });
        area.applyOptions({ lineColor: next.line, topColor: `${next.line}30`, bottomColor: `${next.line}00` });
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      setReady(true);
    }).catch(() => { if (!disposed) setUnavailable(true); });
    return () => { disposed = true; observer?.disconnect(); api?.remove(); chart.current = null; series.current = null; };
  }, []);

  useEffect(() => {
    if (!ready || !chart.current || !series.current) return;
    const old = previous.current;
    const plan = planHealthChartUpdate(old.key === service?.key ? old.points : [], points);
    if (plan.reset) series.current.setData(plan.retained);
    else for (const point of plan.updates) series.current.update(point);
    const last = plan.retained.at(-1);
    if (!old.points.some((point) => point.value !== undefined) && last && plan.retained.some((point) => point.value !== undefined)) {
      chart.current.timeScale().setVisibleRange({ from: (last.time - selectedRange.current) as UTCTimestamp, to: last.time });
    }
    previous.current = { key: service?.key, points: plan.retained };
  }, [points, ready, service?.key]);

  // Changing the visible time range never reloads the underlying series.
  useEffect(() => {
    selectedRange.current = range;
    const retained = previous.current.points;
    const last = retained.at(-1);
    if (ready && chart.current && last && retained.some((point) => point.value !== undefined)) {
      chart.current.timeScale().setVisibleRange({ from: (last.time - range) as UTCTimestamp, to: last.time });
    }
  }, [range, ready, service?.key]);

  function resetView() {
    const last = Number(points.at(-1)?.time);
    if (chart.current && Number.isFinite(last) && points.some((point) => "value" in point)) chart.current.timeScale().setVisibleRange({ from: (last - range) as UTCTimestamp, to: last as UTCTimestamp });
  }

  return (
    <section className="health-panel health-response-chart health-trading-chart" aria-labelledby="response-chart-title">
      <div className="health-card-heading"><h2 id="response-chart-title">Response Time</h2><select className="health-select" aria-label="Response time component" value={service?.key ?? ""} onChange={(event) => { const next = data.services.find((item) => item.key === event.target.value); if (next) setServiceKey(next.key); }}>{data.services.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></div>
      <div className="health-chart-quote"><strong>{formatResponseTime(service?.responseMs ?? null)}</strong><span>LOW <b>{stats.low === null ? "—" : formatResponseTime(stats.low)}</b></span><span>HIGH <b>{stats.high === null ? "—" : formatResponseTime(stats.high)}</b></span></div>
      <div className="health-trading-canvas" ref={container} role="img" aria-label={`${service?.name ?? "Service"} response time chart. Drag to pan, scroll or pinch to zoom. Times are in Manila time.`}>
        <div className="health-chart-tooltip" ref={tooltip} hidden />
        {!stats.count || unavailable ? <div className="health-chart-no-data">{unavailable ? "The chart could not load. Reload to try again." : "Waiting for response time readings…"}</div> : null}
      </div>
      <div className="health-chart-controls"><div role="group" aria-label="Chart time range">{RANGES.map(([seconds, label]) => <button type="button" key={seconds} aria-pressed={range === seconds} onClick={() => setRange(seconds)}>{label}</button>)}</div><div><button type="button" aria-label="Reset chart view" onClick={resetView}><RotateCcw className="size-3.5" aria-hidden="true" /></button><button type="button" aria-label="Fit all chart data" onClick={() => chart.current?.timeScale().fitContent()}><Maximize2 className="size-3.5" aria-hidden="true" /></button></div></div>
    </section>
  );
});
