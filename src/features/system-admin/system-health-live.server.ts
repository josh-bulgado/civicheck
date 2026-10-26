import type { HealthLiveSample, ServiceKey } from "./system-admin.types";

const SAMPLE_CACHE_MS = 4_500;
const PROBE_TIMEOUT_MS = 4_000;
const SERVICE_KEYS: ServiceKey[] = ["database", "authentication", "storage"];

/** Shared per server instance: simultaneous viewers reuse a single set of probes.
 * Only timing and success leave this function; query results are discarded. */
export function createHealthSampler(
  probes: Record<ServiceKey, () => PromiseLike<{ error: unknown }>>,
) {
  let cached: HealthLiveSample | null = null;
  let sampledAt = 0;
  let pending: Promise<HealthLiveSample> | null = null;

  async function measure(key: ServiceKey): Promise<HealthLiveSample["services"][number]> {
    const started = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => probes[key]()),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Probe timeout")), PROBE_TIMEOUT_MS); }),
      ]);
      if (result.error) throw new Error("Probe failed");
      return { key, ok: true, responseMs: Math.max(1, Math.round(performance.now() - started)) };
    } catch {
      return { key, ok: false, responseMs: null };
    } finally {
      clearTimeout(timer);
    }
  }

  return async function sample(): Promise<HealthLiveSample> {
    if (pending) return pending;
    if (cached && Date.now() - sampledAt < SAMPLE_CACHE_MS) return cached;
    sampledAt = Date.now();
    pending = Promise.all(SERVICE_KEYS.map(measure))
      .then((services) => { cached = { at: new Date().toISOString(), services }; return cached; })
      .finally(() => { pending = null; });
    return pending;
  };
}
