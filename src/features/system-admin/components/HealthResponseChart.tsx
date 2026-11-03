import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, RotateCcw } from "lucide-react";
import { QuietAnchor } from "~/components/quiet-link";
import type { AutoscaleInfoProvider, IChartApi, IPriceLine, ISeriesApi, Time, UTCTimestamp } from "lightweight-charts";
import type { SystemHealthDashboard } from "../system-admin.types";
import { formatResponseTime } from "../system-health.utils";
import { healthChartFailureWindows, healthChartPoints, healthChartStats, planHealthChartUpdate, type HealthChartPoint } from "../system-health-chart.model";
import { consecutiveFailedChecks } from "../system-health-history.model";

const RANGES = [[900, "15m"], [3600, "1h"], [21600, "6h"], [86400, "24h"]] as const;
const clock = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function chartColors(container: HTMLElement) {
  const styles = getComputedStyle(container);
  return {
    ink: styles.getPropertyValue("--muted-foreground").trim(),
    grid: styles.getPropertyValue("--health-edge").trim(),
    line: styles.getPropertyValue("--health-chart-line").trim(),
    background: styles.getPropertyValue("--card").trim(),
    warning: styles.getPropertyValue("--health-warning-dot").trim(),
  };
}

export const HealthResponseChart = memo(function HealthResponseChart({ data }: { data: SystemHealthDashboard }) {
  const [serviceKey, setServiceKey] = useState(data.services[0]?.key);
  const [range, setRange] = useState<number>(3600);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [failureRects, setFailureRects] = useState<{ from: number; left: number; width: number }[]>([]);
  const selectedRange = useRef(range);
  const container = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Area"> | null>(null);
  const threshold = useRef<IPriceLine | null>(null);
  const previous = useRef<{ key: string | undefined; points: HealthChartPoint[] }>({ key: undefined, points: [] });
  const service = data.services.find((item) => item.key === serviceKey) ?? data.services[0];
  const slowAfterMs = service?.slowAfterMs;
  const points = useMemo(() => healthChartPoints(service?.checks ?? []), [service?.checks]);
  const stats = useMemo(() => healthChartStats(points, range), [points, range]);
  const failureWindows = useMemo(() => healthChartFailureWindows(points), [points]);
  const failed = service?.outcome === "failed";
  const failedCount = failed ? consecutiveFailedChecks(service.checks) : 0;

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
        // The chart controls provide the visible TradingView attribution link.
        layout: { background: { type: ColorType.Solid, color: colors.background }, textColor: colors.ink, fontFamily: "Geist Variable, sans-serif", fontSize: 10, attributionLogo: false },
        grid: { vertLines: { visible: false }, horzLines: { color: `${colors.grid}50`, style: LineStyle.Solid } },
        crosshair: { mode: CrosshairMode.Normal, vertLine: { color: colors.ink, width: 1, style: LineStyle.Dashed }, horzLine: { color: colors.ink, width: 1, style: LineStyle.Dashed } },
        rightPriceScale: { visible: false },
        leftPriceScale: { visible: true, borderVisible: false, minimumWidth: 36, scaleMargins: { top: .06, bottom: 0 } },
        timeScale: { timeVisible: true, secondsVisible: false, borderVisible: false, rightOffset: 0, minBarSpacing: .1, tickMarkFormatter: (time: Time, type: number) => typeof time === "number" ? clock.format(new Date(time * 1000)).slice(0, type === TickMarkType.TimeWithSeconds ? 8 : 5) : "" },
        localization: { locale: "en-PH", timeFormatter: (time: Time) => typeof time === "number" ? clock.format(new Date(time * 1000)) : "", priceFormatter: (value: number) => `${Math.round(value)}` },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      });
      const area = api.addSeries(AreaSeries, {
        priceScaleId: "left", lineColor: colors.line, topColor: `${colors.line}20`, bottomColor: `${colors.line}20`, lineWidth: 2,
        priceFormat: { type: "custom", minMove: 1, formatter: (value: number) => `${Math.round(value)}` },
        crosshairMarkerVisible: true, crosshairMarkerRadius: 4, lastValueVisible: false, priceLineVisible: false,
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
        api?.applyOptions({ layout: { background: { type: ColorType.Solid, color: next.background }, textColor: next.ink }, grid: { horzLines: { color: `${next.grid}50` } } });
        area.applyOptions({ lineColor: next.line, topColor: `${next.line}20`, bottomColor: `${next.line}20` });
        threshold.current?.applyOptions({ color: next.warning });
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      setReady(true);
    }).catch(() => { if (!disposed) setUnavailable(true); });
    return () => { disposed = true; observer?.disconnect(); api?.remove(); chart.current = null; series.current = null; threshold.current = null; };
  }, []);

  useEffect(() => {
    const area = series.current;
    const element = container.current;
    if (!ready || !area || !element || slowAfterMs == null) return;
    const colors = chartColors(element);
    const limit = slowAfterMs;
    const autoscaleInfoProvider: AutoscaleInfoProvider = (original) => {
      const scale = original();
      return scale?.priceRange ? { ...scale, priceRange: { minValue: 0, maxValue: Math.max(limit * 2, scale.priceRange.maxValue) } } : scale;
    };
    area.applyOptions({
      lineColor: colors.line, topColor: `${colors.line}20`, bottomColor: `${colors.line}20`,
      autoscaleInfoProvider,
    });
    if (threshold.current) area.removePriceLine(threshold.current);
    threshold.current = area.createPriceLine({ price: limit, color: colors.warning, lineWidth: 1, lineStyle: 2, lineVisible: !failed, axisLabelVisible: false, title: "" });
  }, [ready, service?.key, service?.status, slowAfterMs, failed]);

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

  useEffect(() => {
    const api = chart.current;
    const element = container.current;
    if (!ready || !api || !element) return;
    function drawFailureWindows() {
      if (!api) return;
      const scale = api.timeScale();
      const offset = api.priceScale("left").width();
      const width = scale.width();
      setFailureRects(failureWindows.flatMap((window) => {
        const from = scale.timeToCoordinate(window.from);
        const to = scale.timeToCoordinate(window.to);
        if (from === null || to === null || from > width || to < 0) return [];
        const left = Math.max(0, from);
        return [{ from: window.from, left: offset + left, width: Math.max(2, Math.min(width, to) - left) }];
      }));
    }
    const frame = requestAnimationFrame(drawFailureWindows);
    api.timeScale().subscribeVisibleLogicalRangeChange(drawFailureWindows);
    const observer = new ResizeObserver(drawFailureWindows);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (chart.current === api) api.timeScale().unsubscribeVisibleLogicalRangeChange(drawFailureWindows);
    };
  }, [failureWindows, ready]);

  function resetView() {
    const last = Number(points.at(-1)?.time);
    if (chart.current && Number.isFinite(last) && points.some((point) => "value" in point)) chart.current.timeScale().setVisibleRange({ from: (last - range) as UTCTimestamp, to: last as UTCTimestamp });
  }

  return (
    <section className="health-panel health-response-chart health-trading-chart" data-status={service?.status} data-failed={failed || undefined} aria-labelledby="response-chart-title">
      <div className="health-card-heading"><h2 id="response-chart-title">Response time</h2><select className="health-select" aria-label="Response time component" value={service?.key ?? ""} onChange={(event) => { const next = data.services.find((item) => item.key === event.target.value); if (next) setServiceKey(next.key); }}>{data.services.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></div>
      <div className="health-chart-quote" data-failed={failed || undefined}><strong>{failed ? "Timed out" : service?.responseMs == null ? "—" : formatResponseTime(service.responseMs).replace(/ ms$/, "")}</strong><span>{failed ? failedCount > 1 ? `Last ${failedCount} checks failed` : "Last check failed" : "ms"}</span></div>
      <div className="health-chart-plot">
        <div className="health-trading-canvas" ref={container} role="img" aria-label={`${service?.name ?? "Service"} response time chart. Failed checks are shaded red with no latency reading. Drag to pan, scroll or pinch to zoom. Times are in Manila time.`}>
          <div className="health-chart-failure-overlay" aria-hidden="true">{failureRects.map((rect) => <span key={rect.from} style={{ left: rect.left, width: rect.width }} />)}</div>
          <div className="health-chart-tooltip" ref={tooltip} hidden />
          {!stats.count || unavailable ? <div className="health-chart-no-data">{unavailable ? "The chart could not load. Reload to try again." : failed ? "No response time readings in this range." : "Waiting for response time readings…"}</div> : null}
        </div>
        <div className="health-chart-tools"><button type="button" aria-label="Reset chart view" onClick={resetView}><RotateCcw className="size-3.5" aria-hidden="true" /></button><button type="button" aria-label="Fit all chart data" onClick={() => chart.current?.timeScale().fitContent()}><Maximize2 className="size-3.5" aria-hidden="true" /></button></div>
      </div>
      <div className="health-chart-controls"><div role="group" aria-label="Chart time range">{RANGES.map(([seconds, label]) => <button type="button" key={seconds} aria-pressed={range === seconds} onClick={() => setRange(seconds)}>{label}</button>)}</div><QuietAnchor href="https://www.tradingview.com/" target="_blank" rel="noreferrer" title="TradingView Lightweight Charts™. Copyright (с) 2025 TradingView, Inc.">Charts by TradingView</QuietAnchor></div>
    </section>
  );
});
