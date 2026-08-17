// ─── Server-side cache for the service catalogue ─────────────────────────────
//
// The registry is reference data: 25 services and ~113 requirement rows that
// only ever change when an admin edits them, but that every applicant-facing
// read touches — the services directory, each requirements popup, the public
// checklist page, the apply wizard. Before this, each of those reads went to
// Postgres, and most went twice (services, then requirements) *sequentially*,
// so the round trips stacked up on the critical path of every navigation.
//
// The whole catalogue is small enough to hold in memory, so it is loaded once
// per server process and every read is derived from that copy. Admin mutations
// call `invalidateServiceCatalogue()`, so an edit still shows up immediately
// rather than waiting out the TTL.
//
// Two deliberate choices:
//
//  - The entry holds the in-flight *promise*, not the resolved value, so a burst
//    of concurrent requests on a cold cache shares one query instead of each
//    firing its own.
//  - It reads through the stateless anon client, not the cookie-bound request
//    client. SELECT on both tables is `USING (true)` for every role, so the rows
//    are identical for anyone who asks — there is nothing user-specific to leak
//    into a shared cache, and the query stays decoupled from any one request's
//    cookie lifetime.

import { getSupabaseStatelessClient } from "~/utils/supabase";
import type {
  Service,
  ServiceRequirement,
} from "~/features/admin/services/services.types";

const TTL_MS = 5 * 60 * 1000;

export interface ServiceCatalogue {
  services: Service[];
  requirements: ServiceRequirement[];
  /** Requirement rows keyed by `service_code` *and* by `requirement_group`. */
  requirementsByKey: Map<string, ServiceRequirement[]>;
  /**
   * Requirement rows keyed by `requirement_group` alone. Narrower than
   * `requirementsByKey` on purpose — the checklist page resolves a group to its
   * shared checklist and must not pick up rows that merely share a service code.
   */
  requirementsByGroup: Map<string, ServiceRequirement[]>;
  /** Every service in a `display_group`, in `service_code` order. */
  servicesByGroup: Map<string, Service[]>;
  servicesByCode: Map<string, Service>;
}

let entry: { promise: Promise<ServiceCatalogue>; expiresAt: number } | null =
  null;

async function fetchCatalogue(): Promise<ServiceCatalogue> {
  const supabase = getSupabaseStatelessClient();

  // Independent queries — issue both at once rather than paying two serial
  // round trips to Supabase.
  const [servicesResult, requirementsResult] = await Promise.all([
    supabase
      .from("services_registry")
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("service_requirements_metadata")
      .select("*")
      // Mandatory first, so callers that de-duplicate by name keep the stricter
      // copy of a requirement that appears under several keys.
      .order("is_mandatory", { ascending: false }),
  ]);

  if (servicesResult.error) throw new Error(servicesResult.error.message);
  if (requirementsResult.error) throw new Error(requirementsResult.error.message);

  const services = (servicesResult.data ?? []) as Service[];
  const requirements = (requirementsResult.data ?? []) as ServiceRequirement[];

  // Build the lookups once here instead of re-scanning the arrays on every read.
  const requirementsByKey = new Map<string, ServiceRequirement[]>();
  const requirementsByGroup = new Map<string, ServiceRequirement[]>();
  const push = (
    map: Map<string, ServiceRequirement[]>,
    key: string | null,
    requirement: ServiceRequirement,
  ) => {
    if (!key) return;
    const bucket = map.get(key);
    if (bucket) bucket.push(requirement);
    else map.set(key, [requirement]);
  };
  for (const requirement of requirements) {
    push(requirementsByKey, requirement.service_code, requirement);
    // A row whose group equals its own code would otherwise be indexed twice.
    if (requirement.requirement_group !== requirement.service_code) {
      push(requirementsByKey, requirement.requirement_group, requirement);
    }
    push(requirementsByGroup, requirement.requirement_group, requirement);
  }

  const servicesByGroup = new Map<string, Service[]>();
  const servicesByCode = new Map<string, Service>();
  for (const service of services) {
    servicesByCode.set(service.service_code, service);
    if (!service.display_group) continue;
    const bucket = servicesByGroup.get(service.display_group);
    if (bucket) bucket.push(service);
    else servicesByGroup.set(service.display_group, [service]);
  }
  for (const bucket of servicesByGroup.values()) {
    bucket.sort((a, b) => a.service_code.localeCompare(b.service_code));
  }

  return {
    services,
    requirements,
    requirementsByKey,
    requirementsByGroup,
    servicesByGroup,
    servicesByCode,
  };
}

/** Read the catalogue, loading it only when the cached copy has expired. */
export function loadServiceCatalogue(): Promise<ServiceCatalogue> {
  const hit = entry;
  if (hit && hit.expiresAt > Date.now()) return hit.promise;

  const promise = fetchCatalogue().catch((error) => {
    // Never leave a rejected promise cached, or every retry until the TTL
    // expires replays the same failure.
    if (entry?.promise === promise) entry = null;
    throw error;
  });

  entry = { promise, expiresAt: Date.now() + TTL_MS };
  return promise;
}

/**
 * Drop the cached catalogue. Admin service/requirement mutations call this so
 * the next read reflects the edit straight away.
 */
export function invalidateServiceCatalogue(): void {
  entry = null;
}

/**
 * Resolve a card's code — which may be a `display_group` or a bare
 * `service_code` — to the case(s) behind it.
 */
export function resolveServices(
  catalogue: ServiceCatalogue,
  codeOrGroup: string,
): { services: Service[]; isGroup: boolean } {
  const grouped = catalogue.servicesByGroup.get(codeOrGroup);
  if (grouped && grouped.length > 0) return { services: grouped, isGroup: true };

  const single = catalogue.servicesByCode.get(codeOrGroup);
  return { services: single ? [single] : [], isGroup: false };
}

/**
 * Collect the checklist for a set of services against every key they touch —
 * the group key, each case's `service_code`, and each case's
 * `requirement_group` — then de-duplicate by requirement name.
 *
 * Some grouped services keep one shared checklist on the group key
 * (`birth_delayed`) while others keep a separate checklist per case
 * (`ra9048_10172`), so looking at the group key alone misses the latter.
 */
export function collectRequirements(
  catalogue: ServiceCatalogue,
  codeOrGroup: string,
  services: Service[],
): ServiceRequirement[] {
  const keys = new Set<string>([codeOrGroup]);
  for (const service of services) {
    keys.add(service.service_code);
    if (service.requirement_group) keys.add(service.requirement_group);
  }

  // Gather every candidate first, de-duplicating by id: a row indexed under two
  // of our keys must not be considered twice.
  const seenIds = new Set<string>();
  const candidates: ServiceRequirement[] = [];
  for (const key of keys) {
    for (const requirement of catalogue.requirementsByKey.get(key) ?? []) {
      if (seenIds.has(requirement.id)) continue;
      seenIds.add(requirement.id);
      candidates.push(requirement);
    }
  }

  // Mandatory rows first — the name de-duplication below keeps whichever copy it
  // meets first, and a requirement that is mandatory under any of these keys
  // must be presented as mandatory. Sorting has to happen across the whole set,
  // not per key, or the winner depends on which key was visited first.
  candidates.sort((a, b) => Number(b.is_mandatory) - Number(a.is_mandatory));

  const seenNames = new Set<string>();
  return candidates.filter((requirement) => {
    const name = requirement.requirement_name.trim().toLowerCase();
    if (seenNames.has(name)) return false;
    seenNames.add(name);
    return true;
  });
}
