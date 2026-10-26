import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { HealthLiveSample, SystemHealthDashboard } from "../system-admin.types";
import { getSystemHealthSample } from "../system-health-live.functions";
import { HEALTH_SAMPLE_INTERVAL_MS, MAX_SESSION_SAMPLES, withHealthSamples } from "../system-health-live.model";

export function useHealthSampling(data: SystemHealthDashboard, enabled: boolean) {
  const getSample = useServerFn(getSystemHealthSample);
  const [samples, setSamples] = useState<HealthLiveSample[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let pending = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;

    async function poll() {
      clearTimeout(timer);
      if (disposed || pending || document.hidden || !navigator.onLine) return;
      pending = true;
      const started = Date.now();
      const controller = new AbortController();
      request = controller;
      const deadline = setTimeout(() => controller.abort(), 8000);
      try {
        const sample = await getSample({ signal: controller.signal });
        if (disposed) return;
        setSamples((previous) => previous.length && previous[previous.length - 1].at >= sample.at ? previous : [...previous, sample].slice(-MAX_SESSION_SAMPLES));
        setError(false);
        failures = 0;
      } catch {
        if (!disposed && !document.hidden && navigator.onLine) { setError(true); failures += 1; }
      } finally {
        clearTimeout(deadline);
        request = undefined;
        pending = false;
        if (!disposed && !document.hidden && navigator.onLine) {
          const interval = Math.min(30_000, HEALTH_SAMPLE_INTERVAL_MS * 2 ** Math.min(failures, 3));
          timer = setTimeout(() => void poll(), Math.max(250, interval - (Date.now() - started)));
        }
      }
    }
    const resume = () => {
      if (!navigator.onLine) { clearTimeout(timer); request?.abort(); setError(true); }
      else if (document.hidden) { clearTimeout(timer); request?.abort(); }
      else void poll();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
      request?.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
    };
  }, [enabled, getSample]);

  return { data: useMemo(() => withHealthSamples(data, samples), [data, samples]), error, sampledAt: samples.at(-1)?.at ?? null };
}
