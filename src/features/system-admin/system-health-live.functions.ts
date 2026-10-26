import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireActiveSession } from "~/server/auth";
import { getSupabaseAdminClient } from "~/utils/supabase";
import { createHealthSampler } from "./system-health-live.server";

// Lazy initialization keeps secrets and clients out of module evaluation.
let sampler: ReturnType<typeof createHealthSampler> | undefined;

export const getSystemHealthSample = createServerFn({ method: "GET" }).handler(async () => {
  // Always authorize before accessing even a shared, cached sample.
  await requireActiveSession("health:view");
  setResponseHeader("Cache-Control", "no-store");
  if (!sampler) {
    // One stateless client serves all three probes and subsequent sample ticks.
    const admin = getSupabaseAdminClient({ requestTimeoutMs: 4000 });
    sampler = createHealthSampler({
      database: () => admin.from("profiles").select("id", { head: true }).limit(1),
      authentication: () => admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      storage: () => admin.storage.listBuckets(),
    });
  }
  return sampler();
});
